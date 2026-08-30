"""
LLM Service — Lesson plan generation via Google Gemini.
"""

import json
import logging

from google import genai
from google.genai import types

from app.config import settings
from app.models.schemas import (
    LessonPlan,
    LessonPlanRequest,
    MultiDayLessonPlan,
)
from prompts.lesson_planning import (
    SYSTEM_PROMPT_BASE,
    TIME_ADAPTATION_RULES,
    RAG_GROUNDING_BLOCK,
    build_user_message,
)

logger = logging.getLogger(__name__)

# Initialise the Gemini client once at module level
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.LLM_API_KEY:
            raise RuntimeError("LLM_API_KEY is not configured — cannot call Gemini.")
        _client = genai.Client(api_key=settings.LLM_API_KEY)
    return _client


def _build_system_prompt(context_chunks: list[str]) -> str:
    """Compose the full system prompt from template blocks."""
    parts = [SYSTEM_PROMPT_BASE, TIME_ADAPTATION_RULES]

    if context_chunks:
        joined = "\n\n".join(context_chunks)
        parts.append(RAG_GROUNDING_BLOCK.format(chunks=joined))

    return "\n\n".join(parts)


async def generate_lesson_plan(
    request: LessonPlanRequest,
    context_chunks: list[str],
) -> LessonPlan | MultiDayLessonPlan:
    """Call Gemini to produce a structured lesson plan."""

    client = _get_client()

    system_prompt = _build_system_prompt(context_chunks)
    user_message = build_user_message(
        topic=request.topic,
        learner_level=request.learner_level,
        language=request.language,
        available_time_minutes=request.available_time_minutes,
        learning_objective=request.learning_objective,
        preferred_style=request.preferred_style,
    )

    logger.info(
        "Generating lesson plan — model=%s, time=%d min, level=%s",
        settings.LLM_MODEL,
        request.available_time_minutes,
        request.learner_level,
    )

    response = client.models.generate_content(
        model=settings.LLM_MODEL,
        contents=user_message,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            temperature=0.7,
        ),
    )

    raw_text = response.text
    data = json.loads(raw_text)

    # Determine if the LLM returned a multi-day plan
    if data.get("multi_day"):
        plan = MultiDayLessonPlan.model_validate(data)
    else:
        plan = LessonPlan.model_validate(data)

    logger.info("Lesson plan generated: %s", plan.title if hasattr(plan, "title") else f"{len(plan.days)}-day plan")
    return plan
