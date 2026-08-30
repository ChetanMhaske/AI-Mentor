"""
Video Service — Handles background rendering of TTS and Avatar generation.
For hackathon MVP, mocks actual generation if keys are missing.
"""

import asyncio
import logging
import uuid
import httpx
from typing import Dict

from app.models.schemas import JobStatusResponse

logger = logging.getLogger(__name__)

# In-memory store for background job statuses
# In production, use Redis/Postgres
_jobs: Dict[str, JobStatusResponse] = {}

NODE_SERVER_URL = "http://localhost:5000"


def get_job_status(job_id: str) -> JobStatusResponse | None:
    return _jobs.get(job_id)


async def render_video_async(
    job_id: str,
    lesson_id: str,
    section_index: int,
    script: str
):
    """
    Background task to generate TTS audio and Avatar video, then notify Node server.
    """
    logger.info(f"Job {job_id} starting render for lesson {lesson_id} section {section_index}")
    
    _jobs[job_id] = JobStatusResponse(job_id=job_id, status="processing")
    
    try:
        # Mock TTS Generation (e.g. ElevenLabs)
        await asyncio.sleep(2)
        mock_audio_url = f"https://mock-storage.example.com/audio/{job_id}.mp3"
        logger.info(f"Job {job_id} TTS complete: {mock_audio_url}")
        
        # Mock Avatar Generation (e.g. D-ID / HeyGen)
        await asyncio.sleep(3)
        mock_video_url = f"https://mock-storage.example.com/video/{job_id}.mp4"
        logger.info(f"Job {job_id} Avatar complete: {mock_video_url}")

        # Update local status
        _jobs[job_id].status = "ready"
        _jobs[job_id].video_url = mock_video_url
        _jobs[job_id].audio_url = mock_audio_url

        # Notify Node Server via callback
        callback_url = f"{NODE_SERVER_URL}/api/lessons/{lesson_id}/section/{section_index}/video-ready"
        
        async with httpx.AsyncClient() as client:
            res = await client.post(callback_url, json={
                "status": "ready",
                "video_url": mock_video_url,
                "audio_url": mock_audio_url
            })
            
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
                })
        except Exception as cb_exc:
            logger.error(f"Failed to notify node server of failure: {cb_exc}")
