"""
LLM Service — Lesson plan generation via Google Gemini.
"""

import json
import logging

from google import genai
from google.genai import types

from app.config import settings
from app.models.schemas import (
    LearnerProfile,
    LessonPlan,
    LessonPlanPreview,
    LessonPlanRequest,
    MultiDayLessonPlan,
    SwitchLanguageRequest,
    Section,
)
from prompts.lesson_planning import (
    SYSTEM_PROMPT_BASE,
    TIME_ADAPTATION_RULES,
    RAG_GROUNDING_BLOCK,
    PREVIEW_SYSTEM_PROMPT,
    SECTION_TRANSLATION_PROMPT,
    build_learner_profile_block,
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


def _build_system_prompt(
    context_chunks: list[str],
    learner_profile: LearnerProfile | None = None,
) -> str:
    """Compose the full system prompt from template blocks."""
    parts = [SYSTEM_PROMPT_BASE, TIME_ADAPTATION_RULES]

    if learner_profile:
        profile_block = build_learner_profile_block(learner_profile)
        if profile_block:
            parts.append(profile_block)

    if context_chunks:
        joined = "\n\n".join(context_chunks)
        parts.append(RAG_GROUNDING_BLOCK.format(chunks=joined))

    return "\n\n".join(parts)


def _build_preview_system_prompt(
    learner_profile: LearnerProfile | None = None,
) -> str:
    """Compose the system prompt for the lightweight preview endpoint."""
    parts = [PREVIEW_SYSTEM_PROMPT, TIME_ADAPTATION_RULES]

    if learner_profile:
        profile_block = build_learner_profile_block(learner_profile)
        if profile_block:
            parts.append(profile_block)

    return "\n\n".join(parts)


async def generate_lesson_plan(
    request: LessonPlanRequest,
    context_chunks: list[str],
) -> LessonPlan | MultiDayLessonPlan:
    """Call Gemini to produce a structured lesson plan."""

    client = _get_client()

    system_prompt = _build_system_prompt(context_chunks, request.learner_profile)
    user_message = build_user_message(
        topic=request.topic,
        learner_level=request.learner_level,
        language=request.language,
        available_time_minutes=request.available_time_minutes,
        learning_objective=request.learning_objective,
        preferred_style=request.preferred_style,
        learner_profile=request.learner_profile,
    )

    logger.info(
        "Generating lesson plan — model=%s, time=%d min, level=%s, has_profile=%s",
        settings.LLM_MODEL,
        request.available_time_minutes,
        request.learner_level,
        request.learner_profile is not None,
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


async def generate_lesson_preview(
    request: LessonPlanRequest,
) -> LessonPlanPreview:
    """Call Gemini with a lighter prompt to produce a fast outline."""

    client = _get_client()

    system_prompt = _build_preview_system_prompt(request.learner_profile)
    user_message = build_user_message(
        topic=request.topic,
        learner_level=request.learner_level,
        language=request.language,
        available_time_minutes=request.available_time_minutes,
        learning_objective=request.learning_objective,
        preferred_style=request.preferred_style,
        learner_profile=request.learner_profile,
    )

    logger.info(
        "Generating lesson preview — model=%s, time=%d min, level=%s",
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
            temperature=0.5,
            max_output_tokens=1024,
        ),
    )

    raw_text = response.text
    data = json.loads(raw_text)

    preview = LessonPlanPreview.model_validate(data)
    logger.info("Lesson preview generated: %s (%d sections)", preview.title, preview.section_count)
    return preview


async def translate_lesson_section(request: SwitchLanguageRequest) -> Section:
    """Translate a single section using Gemini."""
    client = _get_client()

    profile_block = build_learner_profile_block(request.learner_profile)
    profile_section = f"\nLEARNER PROFILE CONTEXT:\n{profile_block}\n" if profile_block else ""

    section_json = request.section.model_dump_json(indent=2)

    prompt = SECTION_TRANSLATION_PROMPT.format(
        target_language=request.target_language,
        profile_section=profile_section,
        section_json=section_json,
    )

    logger.info(
        "Translating section to %s — model=%s",
        request.target_language,
        settings.LLM_MODEL,
    )

    response = client.models.generate_content(
        model=settings.LLM_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.4, # Lower temp for translation consistency
        ),
    )

    raw_text = response.text
    data = json.loads(raw_text)

    translated_section = Section.model_validate(data)
    return translated_section
