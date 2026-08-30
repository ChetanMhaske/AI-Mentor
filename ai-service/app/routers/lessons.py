"""
Lessons Router — POST /lessons/plan and POST /lessons/plan/preview
"""

import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    LessonPlanRequest,
    LessonPlanResponse,
    PreviewResponse,
)
from app.services import llm_service, rag_service

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
