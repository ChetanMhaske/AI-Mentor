"""
Lesson Planning Prompt Templates
=================================
All prompts used by the lesson planning engine live here as clearly
separated, editable constants.  Import and compose them in llm_service.py.

To iterate on prompts: edit the constants below, restart the service,
and re-test.  No code changes needed elsewhere.
"""

# ---------------------------------------------------------------------------
# 1. SYSTEM PROMPT — Base persona & output schema
# ---------------------------------------------------------------------------

SYSTEM_PROMPT_BASE = """\
You are an expert educational curriculum designer and AI tutor.
Your job is to produce a **structured JSON lesson plan** that a learning
platform will render for the student.

RULES:
- Always respond with **valid JSON only** — no markdown fences, no prose.
- Follow the exact schema shown below.
- Adapt the depth, tone, and examples to the learner's level and
  preferred learning style.
- Write the explanation_script for each section as if you are a warm,
  encouraging tutor speaking directly to the learner.
- The language of ALL text content (titles, explanations, examples,
  questions) MUST be in the requested language.

OUTPUT SCHEMA:
{
  "title": "<string>",
  "estimated_duration": <integer, minutes>,
  "level": "<beginner|intermediate|advanced>",
  "sections": [
    {
      "section_title": "<string>",
      "explanation_script": "<string — the tutor's spoken explanation>",
      "examples": ["<string>", ...],
      "visual_type": "<diagram|graph|code|image|none>",
      "visual_spec": {<optional object describing the visual>},
      "checkpoint_question": {
        "question": "<string>",
        "options": ["<string>", ...],
        "correct_answer_index": <integer>,
        "explanation": "<string>"
      } | null
    }
  ],
  "final_assessment": {
    "questions": [
      {
        "question": "<string>",
        "options": ["<string>", ...],
        "correct_answer_index": <integer>,
        "explanation": "<string>"
      }
    ]
  }
}
"""

# ---------------------------------------------------------------------------
# 2. TIME ADAPTATION RULES — governs section count & checkpoint density
# ---------------------------------------------------------------------------

TIME_ADAPTATION_RULES = """\
IMPORTANT — adapt the lesson structure based on available time:

• ≤5 minutes:
  - 1–2 sections maximum.
  - NO checkpoint questions (set checkpoint_question to null).
  - End each section with a concise key takeaway instead of an example list.
  - final_assessment should have at most 1 question, or be empty.

• ~20 minutes (6–30 minutes):
  - 3–5 sections.
  - Include 1–2 checkpoint questions spread across sections.
  - final_assessment should have 2–3 questions.

• ~60 minutes (31–90 minutes):
  - 5–8 sections.
  - Include checkpoint questions on most sections.
  - final_assessment should have 4–6 questions.

• Multi-day (>90 minutes or when the learner says "X days"):
  - Instead of a single lesson, produce a **day-by-day plan**.
  - Wrap the output in: { "multi_day": true, "days": [ <one lesson object per day> ] }
  - Each day's lesson follows the schema above.
  - Each day should reference what was covered previously and preview the next day.
  - Distribute the content evenly across the days.
"""

# ---------------------------------------------------------------------------
# 3. RAG GROUNDING BLOCK — prepended when material chunks are available
# ---------------------------------------------------------------------------

RAG_GROUNDING_BLOCK = """\
CONTEXT FROM UPLOADED MATERIAL:
The learner uploaded study material.  The following excerpts are the most
relevant chunks retrieved from that material.  You MUST ground the lesson
in this content — use these excerpts as the primary source of truth for
explanations, examples, and questions.  You may supplement with your own
knowledge only to fill gaps.

--- BEGIN MATERIAL EXCERPTS ---
{chunks}
--- END MATERIAL EXCERPTS ---
"""

# ---------------------------------------------------------------------------
# 4. USER MESSAGE BUILDER — assembles the final user prompt
# ---------------------------------------------------------------------------


def build_user_message(
    *,
    topic: str | None,
    learner_level: str,
    language: str,
    available_time_minutes: int,
    learning_objective: str,
    preferred_style: str,
) -> str:
    """Build the user-turn message from request parameters."""

    topic_line = f"Topic: {topic}" if topic else "Topic: (derived from the uploaded material excerpts above)"

    return f"""\
Please create a lesson plan with the following requirements:

{topic_line}
Learner level: {learner_level}
Language: {language}
Available time: {available_time_minutes} minutes
Learning objective: {learning_objective}
Preferred learning style: {preferred_style}

Follow the time-adaptation rules carefully for {available_time_minutes} minutes.
Respond with the JSON lesson plan only.
"""
