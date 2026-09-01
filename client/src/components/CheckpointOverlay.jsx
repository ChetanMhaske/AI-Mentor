import { useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function CheckpointOverlay({ question, onSubmit, evaluationResult, loading, onContinue }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [studentAnswer, setStudentAnswer] = useState("");

  const handleSubmit = () => {
    if (question.options && question.options.length > 0) {
      if (selectedOption === null) return;
      onSubmit(question.options[selectedOption]);
    } else {
      if (!studentAnswer.trim()) return;
      onSubmit(studentAnswer);
    }
  };

  const isMCQ = question.options && question.options.length > 0;

  return (
    <div className="absolute inset-0 z-50 bg-warm-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-warm-900 border border-warm-800/60 p-6 rounded-2xl max-w-2xl w-full max-h-full overflow-y-auto shadow-2xl relative">
        {!evaluationResult ? (
          <div className="animate-fade-in-up">
            <div className="mb-6">
              <span className="bg-pencil-500/15 text-pencil-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-pencil-500/20">
                Knowledge Check
              </span>
            </div>
            <h3 className="text-xl font-bold text-cream-100 mb-6">{question.question}</h3>
            
            {isMCQ ? (
              <div className="space-y-3">
                {question.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedOption === idx 
                        ? "border-pencil-500 bg-pencil-500/15 text-cream-100" 
                        : "border-warm-700/40 bg-warm-800/40 text-warm-300 hover:border-warm-600 hover:bg-warm-800/60"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full h-32 bg-warm-800/40 border border-warm-700/40 rounded-xl p-4 text-cream-200 placeholder-warm-500 focus:border-pencil-500/60 focus:ring-1 focus:ring-pencil-500/40 resize-none outline-none"
              />
            )}

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={loading || (isMCQ ? selectedOption === null : !studentAnswer.trim())}
                className="bg-pencil-500 hover:bg-pencil-600 text-warm-950 font-bold py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-pencil-500/20"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Answer"}
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            {evaluationResult.is_correct ? (
              <div className="text-center py-6">
                <CheckCircle className="w-16 h-16 text-leaf-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-cream-100 mb-2">Great job!</h3>
                <p className="text-warm-400 mb-8">You nailed that concept.</p>
                <button
                  onClick={onContinue}
                  className="bg-leaf-500 hover:bg-leaf-600 text-warm-950 font-bold py-3 px-8 rounded-xl transition-colors shadow-lg shadow-leaf-500/20"
                >
                  Continue Lesson
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4 text-eraser-400">
                  <XCircle className="w-8 h-8" />
                  <h3 className="text-xl font-bold">Not quite right</h3>
                </div>
                
                <div className="bg-eraser-500/10 border border-eraser-400/20 p-5 rounded-xl mb-6">
                  <h4 className="text-eraser-400 font-bold mb-1 text-xs uppercase tracking-wider">Identified Misconception</h4>
                  <p className="text-cream-200">{evaluationResult.misconception}</p>
                </div>

                <div className="bg-warm-800/40 border border-warm-700/40 p-5 rounded-xl mb-6">
                  <h4 className="text-pencil-400 font-bold mb-2 text-xs uppercase tracking-wider">Let's look at it differently</h4>
                  <p className="text-cream-200 leading-relaxed text-sm">{evaluationResult.re_explanation}</p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={onContinue}
                    className="bg-pencil-500 hover:bg-pencil-600 text-warm-950 font-bold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-pencil-500/20"
                  >
                    Try Follow-up Question
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
