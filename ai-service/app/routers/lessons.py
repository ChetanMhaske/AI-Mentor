"""
Lessons Router — POST /lessons/plan and POST /lessons/plan/preview
"""

import logging
import uuid

from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.models.schemas import (
    LessonPlanRequest,
    LessonPlanResponse,
    PreviewResponse,
    SwitchLanguageRequest,
    SwitchLanguageResponse,
    RenderRequest,
    RenderResponse,
    JobStatusResponse,
)
from app.services import llm_service, rag_service, video_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.post("/plan", response_model=LessonPlanResponse)
async def create_lesson_plan(request: LessonPlanRequest):
    """
    Generate a structured lesson plan.

    - If `material_id` is provided, retrieves relevant chunks via the RAG
      pipeline and grounds the plan in them.
    - If only `topic` is provided, the LLM generates from its own knowledge.
    - If `learner_profile` is provided, the plan is personalized to the
      learner's weak/strong concepts, level, interests, and past performance.
    - At least one of `material_id` or `topic` must be given.
    """

    if not request.material_id and not request.topic:
        raise HTTPException(
            status_code=422,
            detail="Either material_id or topic must be provided.",
        )

    # RAG retrieval (if applicable)
    context_chunks: list[str] = []
    grounded = False

    if request.material_id:
        context_chunks = await rag_service.retrieve_chunks(request.material_id)
        grounded = len(context_chunks) > 0

    try:
        plan = await llm_service.generate_lesson_plan(request, context_chunks)
    except Exception as exc:
        logger.exception("Lesson plan generation failed")
        raise HTTPException(
            status_code=502,
            detail=f"LLM generation failed: {exc}",
        )

    return LessonPlanResponse(
        success=True,
        plan=plan,
        grounded_in_material=grounded,
        material_id=request.material_id,
    )


@router.post("/plan/preview", response_model=PreviewResponse)
async def preview_lesson_plan(request: LessonPlanRequest):
    """
    Generate a fast lesson plan outline (titles + one-line summaries).

    Returns quickly before committing to full generation, so the frontend
    can show "here's what I'll teach you" and let the user confirm or adjust.
    """

    if not request.material_id and not request.topic:
        raise HTTPException(
            status_code=422,
            detail="Either material_id or topic must be provided.",
        )

    try:
        preview = await llm_service.generate_lesson_preview(request)
    except Exception as exc:
        logger.exception("Lesson preview generation failed")
        raise HTTPException(
            status_code=502,
            detail=f"LLM preview failed: {exc}",
        )

    return PreviewResponse(success=True, preview=preview)


@router.post("/switch-language", response_model=SwitchLanguageResponse)
async def switch_language(request: SwitchLanguageRequest):
    """
    Translate a specific section into a new language while preserving 
    technical terms and lesson structure.
    """
    try:
        translated_section = await llm_service.translate_lesson_section(request)
    except Exception as exc:
        logger.exception("Section translation failed")
        raise HTTPException(
            status_code=502,
            detail=f"LLM translation failed: {exc}",
        )

    return SwitchLanguageResponse(success=True, section=translated_section)


@router.post("/{lesson_id}/render", response_model=RenderResponse)
async def render_section(lesson_id: str, request: RenderRequest, background_tasks: BackgroundTasks):
    """
    Queue a background task to render TTS and Avatar for a section.
    """
    if request.lesson_id != lesson_id:
        raise HTTPException(status_code=400, detail="Lesson ID mismatch")

    job_id = str(uuid.uuid4())
    
    background_tasks.add_task(
        video_service.render_video_async,
        job_id,
        lesson_id,
        request.section_index,
        request.explanation_script
    )

    return RenderResponse(success=True, job_id=job_id, status="processing")


@router.get("/{lesson_id}/render/{job_id}/status", response_model=JobStatusResponse)
async def get_render_status(lesson_id: str, job_id: str):
    """
    Get the status of a background video render job.
    """
    status = video_service.get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return status
