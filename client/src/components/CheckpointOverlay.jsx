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
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e2029] border border-gray-800 p-8 rounded-2xl max-w-2xl w-full shadow-2xl relative">
        {!evaluationResult ? (
          <>
            <div className="mb-6">
              <span className="bg-indigo-500/20 text-indigo-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Knowledge Check
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-6">{question.question}</h3>
            
            {isMCQ ? (
              <div className="space-y-3">
                {question.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedOption === idx 
                        ? "border-indigo-500 bg-indigo-500/10 text-white" 
                        : "border-gray-700 bg-[#0f1117] text-gray-300 hover:border-gray-600 hover:bg-gray-800"
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
                className="w-full h-32 bg-[#0f1117] border border-gray-700 rounded-xl p-4 text-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            )}

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={loading || (isMCQ ? selectedOption === null : !studentAnswer.trim())}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Answer"}
              </button>
            </div>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {evaluationResult.is_correct ? (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Great job!</h3>
                <p className="text-gray-400 mb-8">You nailed that concept.</p>
                <button
                  onClick={onContinue}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-8 rounded-lg transition-colors"
                >
                  Continue Lesson
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4 text-amber-500">
                  <XCircle className="w-8 h-8" />
                  <h3 className="text-xl font-bold">Not quite right</h3>
                </div>
                
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-6">
                  <h4 className="text-amber-400 font-semibold mb-1 text-sm uppercase tracking-wider">Identified Misconception</h4>
                  <p className="text-gray-300">{evaluationResult.misconception}</p>
                </div>

                <div className="bg-[#0f1117] border border-gray-800 p-5 rounded-xl mb-6">
                  <h4 className="text-indigo-400 font-semibold mb-2 text-sm uppercase tracking-wider">Let's look at it differently</h4>
                  <p className="text-gray-300 leading-relaxed">{evaluationResult.re_explanation}</p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={onContinue}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
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
