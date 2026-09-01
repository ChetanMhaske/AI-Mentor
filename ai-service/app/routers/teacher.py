"""
Teacher Router — Live adaptive teaching interaction endpoints.
POST /teacher/session/start
POST /teacher/interact
POST /teacher/tts
GET  /teacher/session/{session_id}
"""

import json
import logging
import uuid

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    TeacherSessionStartRequest,
    TeacherSessionStartResponse,
    TeacherInteractionRequest,
    TeacherInteractionResponse,
    TeacherTTSRequest,
    TeacherTTSResponse,
)
from app.services import teacher_session as session_manager
from app.services import rag_service
from app.config import settings

from google import genai
from google.genai import types

from prompts.teacher_interaction import (
    TEACHER_INTERACTION_SYSTEM_PROMPT,
    build_teacher_interaction_message,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teacher", tags=["teacher"])

# Reuse the global Gemini client
_client: genai.Client | None = None

def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.LLM_API_KEY:
            raise RuntimeError("LLM_API_KEY is not configured.")
        _client = genai.Client(api_key=settings.LLM_API_KEY)
    return _client


@router.post("/session/start", response_model=TeacherSessionStartResponse)
async def start_session(request: TeacherSessionStartRequest):
    """Create a new teacher session for a lesson."""
    
    # Optionally retrieve RAG chunks if material_id is provided
    rag_chunks = []
    if request.material_id:
        try:
            rag_chunks = await rag_service.retrieve_chunks(
                request.material_id,
                query=request.lesson_topic,
                top_k=5
            )
        except Exception as e:
            logger.warning("Failed to retrieve RAG chunks for session: %s", e)

    session = session_manager.create_session(
        lesson_id=request.lesson_id,
        lesson_title=request.lesson_title,
        lesson_topic=request.lesson_topic,
        sections=request.sections,
        student_level=request.student_level,
        available_time=request.available_time,
        language=request.language,
        student_profile=request.student_profile,
        rag_chunks=rag_chunks,
    )

    return TeacherSessionStartResponse(
        session_id=session.session_id,
        session_state=session.to_dict(),
    )


@router.post("/interact", response_model=TeacherInteractionResponse)
async def interact(request: TeacherInteractionRequest):
    """
    Process a student interaction during a live lesson.
    The AI teacher analyzes the message, detects intent/misconceptions,
    chooses a teaching strategy, and returns a structured response.
    """
    session = session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Start a new session.")

    # Update section index if changed
    if request.current_section_index != session.current_section_index:
        session.current_section_index = request.current_section_index

    # Update remaining time
    session.update_remaining_time()

    # Record the student's message
    session.add_interaction("student", request.student_message)
    session.session_state = "PROCESSING"

    # Build the prompt
    current_section = session.current_section
    user_message = build_teacher_interaction_message(
        student_message=request.student_message,
        current_section_title=current_section.get("section_title", ""),
        current_section_script=current_section.get("explanation_script", ""),
        current_concept=session.current_concept,
        lesson_title=session.lesson_title,
        lesson_topic=session.lesson_topic,
        student_level=session.student_level,
        language=session.language,
        remaining_time_minutes=int(session.remaining_time_minutes),
        concept_mastery=session.concept_mastery,
        detected_misconceptions=session.detected_misconceptions,
        recent_interactions=session.student_interactions,
        student_profile=session.student_profile,
        rag_context=session.get_rag_context(request.student_message),
    )

    try:
        client = _get_client()
        response = client.models.generate_content(
            model=settings.LLM_MODEL,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=TEACHER_INTERACTION_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )

        raw_text = response.text
        data = json.loads(raw_text)

        # Validate and create response
        result = TeacherInteractionResponse.model_validate(data)

    except json.JSONDecodeError as e:
        logger.error("Failed to parse Gemini JSON response: %s", e)
        # Fallback: return the raw text as a simple response
        result = TeacherInteractionResponse(
            response=response.text if response else "I'm having trouble processing that. Could you rephrase?",
            intent="question",
            understanding_level=0.5,
            teaching_strategy="simple_explanation",
        )
    except Exception as e:
        logger.exception("Teacher interaction failed: %s", e)
        raise HTTPException(status_code=502, detail=f"AI teacher interaction failed: {e}")

    # Update session state based on AI response
    session.add_interaction("teacher", result.response, {
        "intent": result.intent,
        "strategy": result.teaching_strategy,
    })

    if result.misconception_detected and result.misconception:
        session.add_misconception(result.misconception)

    if result.mastery_delta != 0 and session.current_concept:
        session.update_mastery(session.current_concept, result.mastery_delta)

    session.current_teaching_strategy = result.teaching_strategy
    session.session_state = "RESPONDING"

    # Attach updated session state to response
    result.session_state = session.to_dict()

    return result


@router.post("/tts", response_model=TeacherTTSResponse)
async def generate_tts(request: TeacherTTSRequest):
    """Generate TTS audio for a teacher response."""
    from app.services.video_service import generate_tts as _generate_tts

    try:
        job_id = str(uuid.uuid4())
        audio_url = await _generate_tts(request.text, job_id, request.language)
        return TeacherTTSResponse(audio_url=audio_url)
    except Exception as e:
        logger.exception("TTS generation failed: %s", e)
        raise HTTPException(status_code=502, detail=f"TTS failed: {e}")


@router.get("/session/{session_id}")
async def get_session_state(session_id: str):
    """Get the current state of a teacher session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session.to_dict()
