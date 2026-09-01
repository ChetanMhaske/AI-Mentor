import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2, CheckCircle2, XCircle, ArrowRight, Trophy,
  Target, Brain, BookOpen, Sparkles, ArrowLeft, ClipboardCheck
} from "lucide-react";

function Assessment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading"); // loading, quiz, submitting, report
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const startAssessment = async () => {
      try {
        const res = await fetch(`/api/lessons/${id}/assessment/start`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to load assessment");
        }
        const data = await res.json();
        setQuestions(data.assessment?.questions || []);
        setPhase("quiz");
      } catch (err) {
        setError(err.message);
        setPhase("quiz");
      }
    };
    startAssessment();
  }, [id, token]);

  const handleSelect = (qIdx, optIdx) => {
    setAnswers(prev => ({ ...prev, [qIdx]: questions[qIdx].options[optIdx] }));
  };

  const handleTextAnswer = (qIdx, text) => {
    setAnswers(prev => ({ ...prev, [qIdx]: text }));
  };

  const handleSubmit = async () => {
    setPhase("submitting");
    try {
      const answerPayload = questions.map((q, i) => ({
        question_index: i,
        question: q.question,
        options: q.options || [],
        student_answer: answers[i] || ""
      }));

      const res = await fetch(`/api/lessons/${id}/assessment/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ answers: answerPayload })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to submit assessment");
      }
      const data = await res.json();
      setReport(data.report);
      setPhase("report");
    } catch (err) {
      setError(err.message);
      setPhase("quiz");
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-pencil-400" />
      </div>
    );
  }

  // Quiz Phase
  if (phase === "quiz") {
    const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] && answers[i].trim());
    return (
      <div className="max-w-3xl mx-auto animate-fade-in-up">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/lesson/${id}/play`)} className="p-2 rounded-full hover:bg-warm-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-warm-400" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-pencil-400 mb-1">
              <ClipboardCheck className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Final Assessment</span>
            </div>
            <h1 className="text-2xl font-bold text-cream-100">Test Your Understanding</h1>
          </div>
        </div>

        {error && <div className="p-4 bg-eraser-500/10 border border-eraser-500/20 rounded-xl text-eraser-400 text-sm mb-6">{error}</div>}

        <div className="space-y-6">
          {questions.map((q, qIdx) => {
            const isMCQ = q.options && q.options.length > 0;
            return (
              <div key={qIdx} className="bg-warm-900 border border-warm-800/60 rounded-2xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-pencil-500/15 text-pencil-400 flex items-center justify-center text-sm font-bold flex-shrink-0">{qIdx + 1}</span>
                  <h3 className="text-cream-200 font-semibold leading-relaxed">{q.question}</h3>
                </div>

                {isMCQ ? (
                  <div className="space-y-2 ml-11">
                    {q.options.map((opt, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => handleSelect(qIdx, optIdx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all ${
                          answers[qIdx] === opt
                            ? "border-pencil-500/50 bg-pencil-500/10 text-cream-200"
                            : "border-warm-700/30 bg-warm-800/30 text-warm-300 hover:border-warm-600"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="ml-11">
                    <textarea
                      value={answers[qIdx] || ""}
                      onChange={e => handleTextAnswer(qIdx, e.target.value)}
                      placeholder="Type your answer..."
                      className="w-full h-24 bg-warm-800/30 border border-warm-700/30 rounded-xl p-3.5 text-cream-200 placeholder-warm-600 focus:border-pencil-500/50 focus:ring-1 focus:ring-pencil-500/30 outline-none resize-none text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="w-full mt-8 py-3.5 bg-pencil-500 hover:bg-pencil-600 text-warm-950 font-bold rounded-xl transition-colors shadow-lg shadow-pencil-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> Submit Assessment
        </button>
      </div>
    );
  }

  // Submitting Phase
  if (phase === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-fade-in-up">
        <Loader2 className="w-12 h-12 text-pencil-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-cream-100 mb-2">Grading Your Assessment</h2>
        <p className="text-warm-400 animate-pulse-soft">Your AI tutor is analyzing your answers...</p>
      </div>
    );
  }

  // Report Phase
  if (phase === "report" && report) {
    const scoreColor = report.percentage >= 80 ? "text-leaf-400" : report.percentage >= 50 ? "text-pencil-400" : "text-eraser-400";
    const scoreBg = report.percentage >= 80 ? "from-leaf-600/20 to-leaf-500/10 border-leaf-500/20" : report.percentage >= 50 ? "from-pencil-600/20 to-pencil-500/10 border-pencil-500/20" : "from-eraser-500/20 to-eraser-400/10 border-eraser-400/20";
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
        {/* Score Hero */}
        <div className={`bg-gradient-to-br ${scoreBg} border rounded-2xl p-8 text-center`}>
          <Trophy className={`w-12 h-12 ${scoreColor} mx-auto mb-3`} />
          <h1 className="text-4xl font-black text-cream-100 mb-1">{report.score}/{report.max_score}</h1>
          <p className={`text-2xl font-bold ${scoreColor}`}>{report.percentage.toFixed(1)}%</p>
          <p className="text-warm-400 mt-2 text-sm">Assessment Complete</p>
        </div>

        {/* Strong / Weak Concepts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-warm-900 rounded-2xl border border-warm-800/60 p-6">
            <h3 className="text-sm font-bold text-leaf-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4" /> Strong Concepts
            </h3>
            <div className="flex flex-wrap gap-2">
              {(report.strong_concepts || []).map((c, i) => (
                <span key={i} className="px-3 py-1.5 bg-leaf-600/15 border border-leaf-500/20 text-leaf-400 text-xs rounded-full font-medium">{c}</span>
              ))}
            </div>
          </div>
          <div className="bg-warm-900 rounded-2xl border border-warm-800/60 p-6">
            <h3 className="text-sm font-bold text-eraser-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" /> Areas to Improve
            </h3>
            <div className="flex flex-wrap gap-2">
              {(report.weak_concepts || []).map((c, i) => (
                <span key={i} className="px-3 py-1.5 bg-eraser-500/15 border border-eraser-400/20 text-eraser-400 text-xs rounded-full font-medium">{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Revision */}
        {report.recommended_revision?.length > 0 && (
          <div className="bg-warm-900 rounded-2xl border border-warm-800/60 p-6">
            <h3 className="text-sm font-bold text-pencil-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Recommended Revision
            </h3>
            <ul className="space-y-2">
              {report.recommended_revision.map((r, i) => (
                <li key={i} className="text-sm text-warm-300 flex items-start gap-2">
                  <span className="text-pencil-500 mt-0.5">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Graded Answers Breakdown */}
        <div className="bg-warm-900 rounded-2xl border border-warm-800/60 p-6">
          <h3 className="text-sm font-bold text-cream-200 uppercase tracking-wider mb-4">Answer Breakdown</h3>
          <div className="space-y-3">
            {(report.graded_answers || []).map((a, i) => (
              <div key={i} className={`p-4 rounded-xl border ${a.is_correct ? "border-leaf-500/20 bg-leaf-600/5" : "border-eraser-400/20 bg-eraser-500/5"}`}>
                <div className="flex items-start gap-3">
                  {a.is_correct ? <CheckCircle2 className="w-5 h-5 text-leaf-400 mt-0.5 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-eraser-400 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-medium text-cream-200">{a.question}</p>
                    <p className="text-xs text-warm-400 mt-1">Your answer: <span className="text-cream-300">{a.student_answer}</span></p>
                    {!a.is_correct && <p className="text-xs text-warm-400 mt-0.5">Correct: <span className="text-leaf-400">{a.correct_answer}</span></p>}
                    <p className="text-xs text-warm-500 mt-1 italic">{a.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Topic CTA */}
        {report.suggested_next_topic && (
          <div className="bg-gradient-to-r from-ink-700/30 to-ink-600/20 border border-ink-600/30 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Suggested Next Topic</span>
              <h3 className="text-lg font-bold text-cream-100 mt-1">{report.suggested_next_topic}</h3>
            </div>
            <button
              onClick={() => navigate(`/upload?topic=${encodeURIComponent(report.suggested_next_topic)}`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-pencil-500 hover:bg-pencil-600 text-warm-950 font-bold rounded-xl transition-colors"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <button onClick={() => navigate("/progress")} className="w-full py-3 bg-warm-800/60 hover:bg-warm-700/60 text-cream-200 font-semibold rounded-xl transition-colors border border-warm-700/30 text-sm">
          View Full Progress Dashboard
        </button>
      </div>
    );
  }

  return null;
}

export default Assessment;
