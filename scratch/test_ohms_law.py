import asyncio
import os
import sys

# Add the app directory to the path so we can import llm_service
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ai-service"))

from app.services.llm_service import evaluate_answer
from app.models.schemas import AnswerEvaluationRequest

async def main():
    request = AnswerEvaluationRequest(
        lesson_id="test",
        section_index=0,
        section_script="Ohm's law states that V = I * R. Voltage is the pressure, Current is the flow of electrons, and Resistance is what slows it down.",
        question="If I increase the resistance in a circuit but keep the voltage the same, what happens to the current? Explain why.",
        options=[],
        student_answer="The current increases because the resistance pushes the electricity faster."
    )
    
    print("Evaluating Student Answer...")
    print(f"Question: {request.question}")
    print(f"Answer: {request.student_answer}")
    print("-" * 40)
    
    result = await evaluate_answer(request)
    
    print(f"Is Correct: {result.is_correct}")
    print(f"Decision: {result.decision}")
    print(f"Misconception: {result.misconception}")
    print(f"Re-explanation: {result.re_explanation}")
    
    if result.follow_up_question:
        print("\nFollow-up Question:")
        print(result.follow_up_question.question)
        for i, opt in enumerate(result.follow_up_question.options):
            print(f"  {i+1}. {opt}")

if __name__ == "__main__":
    asyncio.run(main())
