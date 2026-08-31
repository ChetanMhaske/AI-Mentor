import asyncio
import os
import sys

# Setup environment to load fastapi app correctly
from dotenv import load_dotenv
load_dotenv(".env")
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.video_service import render_video_async, _jobs

async def test_render():
    job_id = "test-job-123"
    lesson_id = "6a95607d02c08711ca73c187"
    section_index = 0
    script = "Hello, world. This is a test of the Gemini TTS system."
    
    print("Starting render...")
    await render_video_async(
        job_id=job_id,
        lesson_id=lesson_id,
        section_index=section_index,
        script=script
    )
    
    status = _jobs.get(job_id)
    print(f"Final status: {status.status}")
    print(f"Audio URL: {status.audio_url}")
    print(f"Video URL: {status.video_url}")
    print(f"Error: {status.error}")

if __name__ == "__main__":
    asyncio.run(test_render())
