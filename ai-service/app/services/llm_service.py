"""
LLM Service — Lesson plan generation via Google Gemini.
"""

import json
import logging
import asyncio
import time
import re
from functools import wraps

from google import genai
from google.genai import types
from google.genai import errors

from fastapi import HTTPException

from app.config import settings
from app.models.schemas import (
    LearnerProfile,
    LessonPlan,
    LessonPlanPreview,
    LessonPlanRequest,
    MultiDayLessonPlan,
    SwitchLanguageRequest,
    Section,
    AnswerEvaluationRequest,
    AnswerEvaluationResponse,
    AssessmentSubmission,
    AssessmentReport,
)
from prompts.lesson_planning import (
    SYSTEM_PROMPT_BASE,
    TIME_ADAPTATION_RULES,
    RAG_GROUNDING_BLOCK,
    PREVIEW_SYSTEM_PROMPT,
    SECTION_TRANSLATION_PROMPT,
    EVALUATION_PROMPT,
    ASSESSMENT_GRADING_PROMPT,
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


class _RateLimiter:
    def __init__(self, calls: int, period: float):
        self.calls = calls
        self.period = period
        self.timestamps = []
        self._lock = asyncio.Lock()

    async def wait_if_needed(self):
        async with self._lock:
            now = time.time()
            # Remove timestamps older than our period
            self.timestamps = [t for t in self.timestamps if now - t < self.period]
            if len(self.timestamps) >= self.calls:
                # Sleep until the oldest timestamp falls out of the window
                sleep_time = self.period - (now - self.timestamps[0])
                if sleep_time > 0:
                    logger.info(f"RateLimiter: Quick succession detected. Delaying Gemini call by {sleep_time:.2f}s...")
                    await asyncio.sleep(sleep_time)
                # Re-evaluate now
                now = time.time()
                self.timestamps = [t for t in self.timestamps if now - t < self.period]
            self.timestamps.append(now)

# Limit to 5 requests per 10 seconds (adjust as needed to prevent hitting standard rate limits)
_limiter = _RateLimiter(calls=5, period=10.0)


def with_retry_and_backoff(max_retries=3):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            await _limiter.wait_if_needed()
            delays = [2, 4, 8]
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    # Check if it's a transient error (503, 429, timeout)
                    is_transient = False
                    err_str = str(e).lower()
                    if isinstance(e, errors.APIError):
                        if getattr(e, "code", None) in (503, 429) or getattr(e, "status_code", None) in (503, 429):
                            is_transient = True
                        elif "503" in err_str or "429" in err_str or "timeout" in err_str or "unavailable" in err_str or "capacity" in err_str:
                            is_transient = True
                    elif "timeout" in err_str or "readtimeout" in err_str:
                        is_transient = True

                    if not is_transient or attempt == max_retries:
                        if attempt == max_retries:
                            logger.error(f"Gemini call failed after {max_retries} retries: {e}")
                            
                            # Parse reset time from Gemini error message if available
                            match = re.search(r"retry in (\d+(?:\.\d+)?)s", str(e))
                            detail_msg = "You have reached the daily API limit. Please try again tomorrow."
                                
                            raise HTTPException(status_code=503, detail=detail_msg)
                        raise # Non-transient error, fail fast
                    
                    delay = delays[attempt] if attempt < len(delays) else delays[-1]
                    logger.warning(f"Gemini rate-limited or unavailable on {func.__name__}, retry {attempt + 1}/{max_retries} in {delay}s... (Error: {e})")
                    await asyncio.sleep(delay)
        return wrapper
    return decorator


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


@with_retry_and_backoff(max_retries=3)
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


@with_retry_and_backoff(max_retries=3)
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


@with_retry_and_backoff(max_retries=3)
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


@with_retry_and_backoff(max_retries=3)
async def evaluate_answer(request: AnswerEvaluationRequest) -> AnswerEvaluationResponse:
    """Evaluate a student's answer to a checkpoint question."""
    client = _get_client()

    prompt = EVALUATION_PROMPT.format(
        section_script=request.section_script,
        question=request.question,
        options=json.dumps(request.options),
        student_answer=request.student_answer,
    )

    logger.info("Evaluating answer for lesson %s, section %d", request.lesson_id, request.section_index)

    response = client.models.generate_content(
        model=settings.LLM_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.6,
        ),
    )

    raw_text = response.text
    data = json.loads(raw_text)

    evaluation = AnswerEvaluationResponse.model_validate(data)
    return evaluation


@with_retry_and_backoff(max_retries=3)
async def grade_assessment(submission: AssessmentSubmission) -> AssessmentReport:
    """Grade all assessment answers and produce a full report."""
    client = _get_client()

    # Build Q&A pairs string for the prompt
    qa_lines = []
    for ans in submission.answers:
        q = submission.questions[ans.question_index] if ans.question_index < len(submission.questions) else None
        correct_option = ""
        if q and q.options and q.correct_answer_index < len(q.options):
            correct_option = q.options[q.correct_answer_index]

        qa_lines.append(
            f"Q{ans.question_index + 1}: {ans.question}\n"
            f"  Options: {json.dumps(ans.options)}\n"
            f"  Correct Answer: {correct_option}\n"
            f"  Student Answer: {ans.student_answer}"
        )

    qa_pairs_str = "\n\n".join(qa_lines)

    prompt = ASSESSMENT_GRADING_PROMPT.format(
        lesson_title=submission.lesson_title,
        lesson_topic=submission.lesson_topic,
        qa_pairs=qa_pairs_str,
    )

    logger.info("Grading assessment for lesson %s", submission.lesson_id)

    response = client.models.generate_content(
        model=settings.LLM_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.4,
        ),
    )

    raw_text = response.text
    data = json.loads(raw_text)

    report = AssessmentReport.model_validate(data)
    return report
