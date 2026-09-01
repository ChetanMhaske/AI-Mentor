"""
Teacher Session — In-memory session state for live adaptive teaching.
"""

import time
import uuid
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class TeacherSession:
    """Represents the live state of one teaching session for a lesson."""

    def __init__(
        self,
        lesson_id: str,
        lesson_title: str,
        lesson_topic: str,
        sections: list,
        student_level: str = "beginner",
        available_time: int = 20,
        language: str = "en",
        student_profile: dict | None = None,
        rag_chunks: list | None = None,
    ):
        self.session_id = str(uuid.uuid4())
        self.lesson_id = lesson_id
        self.lesson_title = lesson_title
        self.lesson_topic = lesson_topic
        self.sections = sections  # The full lesson plan sections
        self.current_section_index = 0
        self.student_level = student_level
        self.available_time = available_time
        self.language = language
        self.student_profile = student_profile or {}
        self.rag_chunks = rag_chunks or []

        # Adaptive state
        self.concept_mastery: Dict[str, float] = {}
        self.detected_misconceptions: list[str] = []
        self.student_interactions: list[dict] = []
        self.current_teaching_strategy: str = "simple_explanation"
        self.session_state: str = "TEACHING"

        # Time tracking
        self.start_time = time.time()
        self.remaining_time_minutes = available_time

        # Initialize concept mastery from sections
        for section in sections:
            title = section.get("section_title", "")
            if title:
                self.concept_mastery[title] = 0.5  # Start at 50% assumed understanding

        logger.info(
            "TeacherSession created: id=%s, lesson=%s, concepts=%d",
            self.session_id, lesson_id, len(self.concept_mastery)
        )

    @property
    def current_section(self) -> dict:
        if 0 <= self.current_section_index < len(self.sections):
            return self.sections[self.current_section_index]
        return {}

    @property
    def current_concept(self) -> str:
        return self.current_section.get("section_title", "")

    def update_remaining_time(self):
        elapsed = (time.time() - self.start_time) / 60.0
        self.remaining_time_minutes = max(0, self.available_time - elapsed)

    def add_interaction(self, role: str, text: str, metadata: dict | None = None):
        """Add a student or teacher interaction to the rolling history."""
        interaction = {
            "role": role,
            "text": text,
            "timestamp": time.time(),
        }
        if metadata:
            interaction.update(metadata)
        self.student_interactions.append(interaction)
        # Keep rolling window of last 20 interactions
        if len(self.student_interactions) > 20:
            self.student_interactions = self.student_interactions[-20:]

    def update_mastery(self, concept: str, delta: float):
        """Update mastery score for a concept, clamped to [0, 1]."""
        current = self.concept_mastery.get(concept, 0.5)
        new_val = max(0.0, min(1.0, current + delta))
        self.concept_mastery[concept] = new_val
        logger.info(
            "Mastery update: concept='%s', delta=%.2f, old=%.2f, new=%.2f",
            concept, delta, current, new_val
        )

    def add_misconception(self, misconception: str):
        """Record a detected misconception."""
        if misconception and misconception not in self.detected_misconceptions:
            self.detected_misconceptions.append(misconception)

    def get_rag_context(self, query: str = "") -> str:
        """Return RAG context chunks as a single string."""
        if not self.rag_chunks:
            return ""
        return "\n\n".join(self.rag_chunks[:5])

    def to_dict(self) -> dict:
        """Serialize session state for API responses."""
        self.update_remaining_time()
        return {
            "session_id": self.session_id,
            "lesson_id": self.lesson_id,
            "current_section_index": self.current_section_index,
            "current_concept": self.current_concept,
            "session_state": self.session_state,
            "concept_mastery": self.concept_mastery,
            "detected_misconceptions": self.detected_misconceptions,
            "current_teaching_strategy": self.current_teaching_strategy,
            "remaining_time_minutes": round(self.remaining_time_minutes, 1),
            "interaction_count": len(self.student_interactions),
        }


# ---------------------------------------------------------------------------
# Session Manager — in-memory store
# ---------------------------------------------------------------------------

_sessions: Dict[str, TeacherSession] = {}


def create_session(
    lesson_id: str,
    lesson_title: str,
    lesson_topic: str,
    sections: list,
    student_level: str = "beginner",
    available_time: int = 20,
    language: str = "en",
    student_profile: dict | None = None,
    rag_chunks: list | None = None,
) -> TeacherSession:
    """Create and store a new TeacherSession."""
    session = TeacherSession(
        lesson_id=lesson_id,
        lesson_title=lesson_title,
        lesson_topic=lesson_topic,
        sections=sections,
        student_level=student_level,
        available_time=available_time,
        language=language,
        student_profile=student_profile,
        rag_chunks=rag_chunks,
    )
    _sessions[session.session_id] = session
    # Cleanup old sessions (keep max 50)
    if len(_sessions) > 50:
        oldest_key = min(_sessions, key=lambda k: _sessions[k].start_time)
        del _sessions[oldest_key]
    return session


def get_session(session_id: str) -> TeacherSession | None:
    """Retrieve a session by ID."""
    return _sessions.get(session_id)


def destroy_session(session_id: str):
    """Remove a session."""
    _sessions.pop(session_id, None)
