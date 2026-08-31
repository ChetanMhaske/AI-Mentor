from typing import Literal
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    service: str


# ---------------------------------------------------------------------------
# Learner Profile — passed from the Node server
# ---------------------------------------------------------------------------

class LearnerProfile(BaseModel):
    """Learner profile data fetched from MongoDB by the Node server."""
    level: str = "beginner"
    preferred_language: str = "en"
    learning_style: str = "visual"
    interests: list[str] = []
    past_topics: list[str] = []
    weak_concepts: list[str] = []
    strong_concepts: list[str] = []
    avg_score: int | None = None


# ---------------------------------------------------------------------------
# Lesson Plan — Request
# ---------------------------------------------------------------------------

class LessonPlanRequest(BaseModel):
    material_id: str | None = Field(
        default=None,
        description="Optional ID of uploaded material to ground the lesson in via RAG.",
    )
    topic: str | None = Field(
        default=None,
        description="Free-text topic. Required if material_id is not provided.",
    )
    learner_level: str = Field(
        description="beginner, intermediate, or advanced.",
        examples=["beginner"],
    )
    language: str = Field(
        default="en",
        description="Language code for lesson content.",
        examples=["en", "hi", "es"],
    )
    available_time_minutes: int = Field(
        description="How many minutes the learner has. Controls section count.",
        ge=1,
        examples=[20],
    )
    learning_objective: str = Field(
        description="What the learner wants to achieve.",
        examples=["Understand how neural networks learn through backpropagation"],
    )
    preferred_style: str = Field(
        default="visual",
        description="visual, auditory, reading, or kinesthetic.",
        examples=["visual"],
    )
    learner_profile: LearnerProfile | None = Field(
        default=None,
        description="Full learner profile from MongoDB, passed by the Node server.",
    )


# ---------------------------------------------------------------------------
# Lesson Plan — Response sub-models
# ---------------------------------------------------------------------------

class CheckpointQuestion(BaseModel):
    question: str
    options: list[str]
    correct_answer_index: int
    explanation: str


class Citation(BaseModel):
    source: str
    chunk_index: int


class Section(BaseModel):
    section_title: str
    explanation_script: str
    examples: list[str] = []
    visual_type: Literal["diagram", "graph", "code", "math", "none"] = "none"
    visual_spec: dict | None = None
    citations: list[Citation] = []
    visual_data: dict | None = Field(default=None, description="Rendered visual output (URL, execution output)")
    checkpoint_question: CheckpointQuestion | None = None
    video_url: str | None = None
    audio_url: str | None = None
    render_status: str | None = Field(default="pending", description="pending, ready, failed")


class AssessmentQuestion(BaseModel):
    question: str
    options: list[str]
    correct_answer_index: int
    explanation: str


class FinalAssessment(BaseModel):
    questions: list[AssessmentQuestion] = []


class LessonPlan(BaseModel):
    """Single lesson plan (or one day within a multi-day plan)."""
    title: str
    estimated_duration: int
    level: str
    sections: list[Section]
    final_assessment: FinalAssessment = FinalAssessment()


class MultiDayLessonPlan(BaseModel):
    """Wrapper when available_time > 90 min — a day-by-day breakdown."""
    multi_day: bool = True
    days: list[LessonPlan]


class LessonPlanResponse(BaseModel):
    """Top-level response returned to the caller."""
    success: bool = True
    plan: LessonPlan | MultiDayLessonPlan
    grounded_in_material: bool = False
    material_id: str | None = None


# ---------------------------------------------------------------------------
# Lesson Plan Preview — lightweight outline
# ---------------------------------------------------------------------------

class PreviewSection(BaseModel):
    """One section in a lesson preview — just title and summary."""
    section_title: str
    summary: str


class LessonPlanPreview(BaseModel):
    """Fast outline returned before committing to full generation."""
    title: str
    estimated_duration: int
    level: str
    section_count: int
    sections: list[PreviewSection]
    has_final_assessment: bool = True


class PreviewResponse(BaseModel):
    """Top-level response for the preview endpoint."""
    success: bool = True
    preview: LessonPlanPreview


# ---------------------------------------------------------------------------
# Mid-Lesson Language Switch
# ---------------------------------------------------------------------------

class SwitchLanguageRequest(BaseModel):
    """Request to translate a single section of a lesson."""
    section: Section
    target_language: str
    learner_profile: LearnerProfile | None = None


class SwitchLanguageResponse(BaseModel):
    success: bool = True
    section: Section


# ---------------------------------------------------------------------------
# Video Rendering
# ---------------------------------------------------------------------------

class RenderRequest(BaseModel):
    """Request to render a video for a section."""
    lesson_id: str
    section_index: int
    explanation_script: str
    visual_type: str = "none"
    visual_spec: dict | None = None


class RenderResponse(BaseModel):
    """Response when a render job is queued."""
    success: bool = True
    job_id: str
    status: str = "processing"


class JobStatusResponse(BaseModel):
    """Status of a rendering job."""
    job_id: str
    status: str
    video_url: str | None = None
    audio_url: str | None = None
    visual_data: dict | None = None
    error: str | None = None


# ---------------------------------------------------------------------------
# Answer Evaluation
# ---------------------------------------------------------------------------

class AnswerEvaluationRequest(BaseModel):
    lesson_id: str
    section_index: int
    section_script: str
    question: str
    options: list[str] = []
    student_answer: str

class AnswerEvaluationResponse(BaseModel):
    is_correct: bool
    decision: str
    misconception: str | None = None
    re_explanation: str | None = None
    follow_up_question: CheckpointQuestion | None = None


# ---------------------------------------------------------------------------
# Assessment Grading
# ---------------------------------------------------------------------------

class StudentAnswer(BaseModel):
    question_index: int
    question: str
    options: list[str] = []
    student_answer: str

class AssessmentSubmission(BaseModel):
    lesson_id: str
    lesson_title: str
    lesson_topic: str
    answers: list[StudentAnswer]
    questions: list[AssessmentQuestion]

class GradedAnswer(BaseModel):
    question_index: int
    question: str
    student_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str

class AssessmentReport(BaseModel):
    score: int
    max_score: int
    percentage: float
    strong_concepts: list[str]
    weak_concepts: list[str]
    incorrect_concepts: list[str]
    recommended_revision: list[str]
    suggested_next_topic: str
    graded_answers: list[GradedAnswer]
