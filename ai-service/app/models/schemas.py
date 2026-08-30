from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    service: str


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


# ---------------------------------------------------------------------------
# Lesson Plan — Response sub-models
# ---------------------------------------------------------------------------

class CheckpointQuestion(BaseModel):
    question: str
    options: list[str]
    correct_answer_index: int
    explanation: str


class Section(BaseModel):
    section_title: str
    explanation_script: str
    examples: list[str] = []
    visual_type: str = Field(
        default="none",
        description="diagram, graph, code, image, or none",
    )
    visual_spec: dict | None = None
    checkpoint_question: CheckpointQuestion | None = None


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
