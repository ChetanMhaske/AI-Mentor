"""
Video Service — Handles background rendering of TTS and Avatar generation.
For hackathon MVP, mocks actual generation if keys are missing.
"""

import asyncio
import logging
import uuid
# pyrefly: ignore [missing-import]
import httpx
import os
import time

logging.basicConfig(level=logging.INFO)
from typing import Dict
# pyrefly: ignore [missing-import]
from gtts import gTTS
# pyrefly: ignore [missing-import]
from gradio_client import Client

from app.models.schemas import JobStatusResponse
from app.services import visual_service
from app.config import settings

# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types

logger = logging.getLogger(__name__)

# In-memory store for background job statuses
_jobs: Dict[str, JobStatusResponse] = {}

NODE_SERVER_URL = "http://localhost:5000"
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "static")
os.makedirs(STATIC_DIR, exist_ok=True)


def get_job_status(job_id: str) -> JobStatusResponse | None:
    return _jobs.get(job_id)

async def generate_tts(script: str, job_id: str) -> str:
    audio_filename = f"{job_id}.mp3"
    audio_path = os.path.join(STATIC_DIR, audio_filename)
    
    try:
        # Try Gemini TTS
        logger.info(f"Attempting Gemini TTS for job {job_id}")
        client = genai.Client(api_key=settings.LLM_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=script,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name="Puck"
                        )
                    )
                )
            )
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                with open(audio_path, "wb") as f:
                    f.write(part.inline_data.data)
                return f"http://localhost:8000/static/{audio_filename}"
        raise ValueError("No audio returned from Gemini")
    except Exception as e:
        logger.warning(f"Gemini TTS failed: {e}. Falling back to edge-tts (Male Voice) for job {job_id}")
        try:
            import edge_tts
            communicate = edge_tts.Communicate(script, "en-US-GuyNeural")
            await communicate.save(audio_path)
            return f"http://localhost:8000/static/{audio_filename}"
        except Exception as e2:
            logger.error(f"edge-tts fallback failed: {e2}")
            raise

async def generate_avatar(audio_url: str, job_id: str) -> tuple[str | None, str]:
    """Attempt Wav2Lip via external API. Returns (video_url, avatar_status)."""
    if not settings.WAV2LIP_ENDPOINT_URL:
        logger.warning("Avatar Generation Skipped: WAV2LIP_ENDPOINT_URL is not set.")
        return None, "fallback_audio"

    audio_filename = audio_url.split("/")[-1]
    audio_path = os.path.join(STATIC_DIR, audio_filename)
    
    for attempt in range(2):
        try:
            logger.info(f"Attempting Avatar generation (Attempt {attempt+1}) via {settings.WAV2LIP_ENDPOINT_URL} for job {job_id}")
            
            async with httpx.AsyncClient(timeout=180.0) as client:
                with open(audio_path, "rb") as af:
                    files = {"audio": (audio_filename, af, "audio/mpeg")}
                    # If endpoint needs an image, assume it provides a default or we can upload our own. 
                    # Assuming basic `POST /` taking form-data `audio`.
                    response = await client.post(
                        settings.WAV2LIP_ENDPOINT_URL, 
                        files=files,
                        headers={"ngrok-skip-browser-warning": "1"}
                    )
                
                response.raise_for_status()
                
                # Save the returned MP4
                video_filename = f"avatar_{job_id}.mp4"
                final_video_path = os.path.join(STATIC_DIR, video_filename)
                
                with open(final_video_path, "wb") as vf:
                    vf.write(response.content)
                
                return f"http://localhost:8000/static/{video_filename}", "generated"
                
        except httpx.TimeoutException:
            logger.warning(f"Wav2Lip timed out on attempt {attempt+1} for job {job_id}")
        except httpx.RequestError as e:
            logger.warning(f"Wav2Lip endpoint unreachable on attempt {attempt+1}: {e}")
        except httpx.HTTPStatusError as e:
            logger.warning(f"Wav2Lip returned error {e.response.status_code} on attempt {attempt+1}")
        except Exception as e:
            logger.warning(f"Wav2Lip unexpected error on attempt {attempt+1}: {e}")
            
        if attempt == 0:
            logger.info("Waiting 5s before retrying Wav2Lip...")
            await asyncio.sleep(5)
            
    logger.warning("LOUD FALLBACK: All Wav2Lip attempts failed. Serving just TTS audio.")
    return None, "fallback_audio"


async def render_video_async(
    job_id: str,
    lesson_id: str,
    section_index: int,
    script: str,
    visual_type: str = "none",
    visual_spec: dict | None = None
):
    """
    Background task to generate TTS audio and Avatar video, then notify Node server.
    """
    logger.info(f"Job {job_id} starting render for lesson {lesson_id} section {section_index}")
    
    _jobs[job_id] = JobStatusResponse(job_id=job_id, status="processing")
    
    try:
        # TTS Generation
        audio_url = await generate_tts(script, job_id)
        logger.info(f"Job {job_id} TTS complete: {audio_url}")
        
        # Avatar Generation
        _jobs[job_id].status = "generating_avatar"
        video_url, avatar_status = await generate_avatar(audio_url, job_id)
        
        if video_url:
            logger.info(f"Job {job_id} Avatar complete: {video_url}")
        else:
            logger.info(f"Job {job_id} using audio-only fallback.")

        # Generate Visuals
        visual_data = visual_service.generate_visual(visual_type, visual_spec)
        logger.info(f"Job {job_id} Visual complete: {visual_data}")

        # Update local status
        _jobs[job_id].status = "ready"
        _jobs[job_id].video_url = video_url
        _jobs[job_id].audio_url = audio_url
        _jobs[job_id].visual_data = visual_data

        # Notify Node Server via callback
        callback_url = f"{NODE_SERVER_URL}/api/lessons/{lesson_id}/section/{section_index}/video-ready"
        
        async with httpx.AsyncClient() as client:
            res = await client.post(callback_url, json={
                "status": "ready",
                "video_url": video_url,
                "audio_url": audio_url,
                "visual_data": visual_data,
                "avatar_status": avatar_status
            }, timeout=10.0)
            
            if res.status_code not in (200, 201):
                logger.error(f"Callback to node server failed with status {res.status_code}")
                
        logger.info(f"Job {job_id} successfully completed and notified Node server.")

    except Exception as exc:
        logger.exception(f"Job {job_id} failed during rendering")
        _jobs[job_id].status = "failed"
        _jobs[job_id].error = str(exc)
        
        # Notify node server of failure
        try:
            callback_url = f"{NODE_SERVER_URL}/api/lessons/{lesson_id}/section/{section_index}/video-ready"
            async with httpx.AsyncClient() as client:
                await client.post(callback_url, json={
                    "status": "failed",
                    "error": str(exc)
                }, timeout=10.0)
        except Exception as cb_exc:
            logger.error(f"Failed to notify node server of failure: {cb_exc}")
