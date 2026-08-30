"""
Lessons Router — POST /lessons/plan
"""

import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import LessonPlanRequest, LessonPlanResponse
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
