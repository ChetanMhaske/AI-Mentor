"""
Video Service — Handles background rendering of TTS and Avatar generation.
For hackathon MVP, mocks actual generation if keys are missing.
"""

import asyncio
import logging
import uuid
import httpx
import os
import time
from typing import Dict
from gtts import gTTS
from gradio_client import Client

from app.models.schemas import JobStatusResponse
from app.services import visual_service
from app.config import settings

from google import genai
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
            model=settings.LLM_MODEL,
            contents=script,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name="Aoede"
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
        logger.warning(f"Gemini TTS failed: {e}. Falling back to gTTS for job {job_id}")
        try:
            tts = gTTS(text=script, lang='en')
            tts.save(audio_path)
            return f"http://localhost:8000/static/{audio_filename}"
        except Exception as e2:
            logger.error(f"gTTS fallback failed: {e2}")
            raise

async def generate_avatar(audio_url: str, script: str, job_id: str) -> str | None:
    """Attempt Wav2Lip via HuggingFace Space Gradio API. Fallback if unreachable."""
    # Attempting to use a public SadTalker/Wav2Lip Space if possible.
    # Since we don't have a specific instance, we'll try to hit it and catch errors.
    try:
        logger.info(f"Attempting Avatar generation via Hugging Face Space for job {job_id}")
        # This is a dummy call just to show the integration architecture. 
        # In a real environment, you'd specify a real space or local URL.
        # client = Client("some-hf-space-url")
        # result = client.predict(audio_file, image_file)
        
        # We will throw to trigger the fallback, because without a reliable API, this will just hang or fail anyway.
        raise RuntimeError("Hosted Wav2Lip space unreachable or not configured.")
    except Exception as e:
        logger.warning(f"Avatar Generation Failed: {e}. LOUD FALLBACK: Serving just TTS audio + on-screen script.")
        return None


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
        
        # Avatar Generation (fallback to None if it fails)
        video_url = await generate_avatar(audio_url, script, job_id)
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
                "visual_data": visual_data
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
