import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, SkipForward, SkipBack, Loader2, HelpCircle, PlayCircle, ClipboardCheck } from "lucide-react";
import VisualRenderer from "../components/VisualRenderer";
import CheckpointOverlay from "../components/CheckpointOverlay";

function LessonPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showScript, setShowScript] = useState(false);

  const sections = lesson?.plan?.sections || [];
  const currentSection = sections[currentSectionIndex];

  useEffect(() => {
    setShowCheckpoint(false);
    setEvaluationResult(null);
    setShowScript(false);
    setCurrentQuestion(currentSection?.checkpoint_question || null);
  }, [currentSectionIndex, currentSection]);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await fetch(`/api/lessons/${id}`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (!res.ok) throw new Error("Failed to load lesson");
        const data = await res.json();
        setLesson(data.lesson);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();

    // Poll every 5 seconds if the current section is pending
    const interval = setInterval(() => {
      setLesson(prev => {
        if (prev && prev.plan && prev.plan.sections) {
          const section = prev.plan.sections[currentSectionIndex];
          if (section && section.render_status === "pending") {
            fetchLesson();
          }
        }
        return prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [id, currentSectionIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-pencil-400" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-eraser-400 mb-4">Error loading lesson</h2>
        <p className="text-warm-400">{error || "Lesson not found"}</p>
      </div>
    );
  }

  const handleMediaEnded = () => {
    if (currentQuestion) setShowCheckpoint(true);
  };

  const handleAnswerSubmit = async (answer) => {
    setEvalLoading(true);
    try {
      const res = await fetch(`/api/lessons/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ sectionIndex: currentSectionIndex, question: currentQuestion.question, options: currentQuestion.options, studentAnswer: answer })
      });
      if (!res.ok) throw new Error("Failed to evaluate answer");
      const data = await res.json();
      setEvaluationResult(data.evaluation);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setEvalLoading(false);
    }
  };

  const handleContinue = () => {
    if (evaluationResult?.decision === "reinforce" && evaluationResult?.follow_up_question) {
      setCurrentQuestion(evaluationResult.follow_up_question);
      setEvaluationResult(null);
    } else {
      setShowCheckpoint(false);
      if (currentSectionIndex < sections.length - 1) setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const hasVisual = currentSection?.visual_type && currentSection.visual_type !== "none";
  const progressPercent = ((currentSectionIndex + 1) / sections.length) * 100;

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-full animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate("/lesson")} className="p-2 rounded-full hover:bg-warm-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-warm-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-cream-100">{lesson.title}</h2>
          <p className="text-sm text-warm-400">Section {currentSectionIndex + 1} of {sections.length}: {currentSection?.section_title}</p>
        </div>
        <button
          onClick={() => navigate(`/lesson/${id}/assessment`)}
          className="flex items-center gap-2 px-4 py-2 bg-pencil-500/15 text-pencil-400 text-sm font-semibold rounded-xl border border-pencil-500/20 hover:bg-pencil-500/25 transition-colors"
        >
          <ClipboardCheck className="w-4 h-4" /> Take Assessment
        </button>
      </div>

      {/* Section Progress Bar */}
      <div className="w-full h-1.5 bg-warm-800 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-pencil-500 to-pencil-400 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0 overflow-hidden">
        {/* Avatar / Video — Focal Point */}
        <div className={`${hasVisual ? "lg:col-span-3" : "lg:col-span-5"} bg-board-900 rounded-2xl border border-board-700/50 overflow-hidden relative flex flex-col`}>
          {/* Video / Avatar Main Area */}
          <div className="flex-1 flex items-center justify-center relative min-h-[300px]">
            {currentSection?.render_status === "ready" && currentSection?.video_url ? (
              <video src={currentSection.video_url} controls autoPlay onEnded={handleMediaEnded} className="w-full h-full object-contain" />
            ) : currentSection?.render_status === "ready" && currentSection?.audio_url ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative w-full h-full">
                {currentSection?.avatar_status === "fallback_audio" && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-warm-800/80 text-warm-300 text-xs font-semibold rounded-full border border-warm-700">
                    Audio-only mode
                  </div>
                )}
                <audio src={currentSection.audio_url} controls autoPlay onEnded={handleMediaEnded} className="mb-6" />
                <PlayCircle className="w-12 h-12 text-warm-600 mb-4" />
                <p className="text-warm-500 text-sm">Avatar unavailable</p>
              </div>
            ) : currentSection?.render_status === "failed" ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                {currentSection?.audio_url && (
                  <audio src={currentSection.audio_url} controls onEnded={handleMediaEnded} className="mb-6" />
                )}
                <PlayCircle className="w-12 h-12 text-warm-600 mb-4" />
                <p className="text-warm-500 text-sm">Avatar rendering failed</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="w-24 h-24 rounded-full bg-pencil-500/10 flex items-center justify-center mb-4">
                  <PlayCircle className="w-12 h-12 text-pencil-400 animate-pulse-soft" />
                </div>
                <p className="text-warm-500 font-medium text-sm">Preparing avatar...</p>
              </div>
            )}

            {/* Checkpoint Overlay */}
            {showCheckpoint && currentQuestion && (
              <CheckpointOverlay
                question={currentQuestion}
                onSubmit={handleAnswerSubmit}
                evaluationResult={evaluationResult}
                loading={evalLoading}
                onContinue={handleContinue}
              />
            )}
          </div>

          {/* On-screen Script / Captions */}
          <div className="bg-warm-950/80 border-t border-warm-800/40 px-6 py-3">
            <button onClick={() => setShowScript(!showScript)} className="text-xs text-warm-500 hover:text-warm-300 font-medium mb-1">
              {showScript ? "Hide Script ▲" : "Show Script ▼"}
            </button>
            {showScript && (
              <p className="text-sm text-cream-300/80 leading-relaxed max-h-24 overflow-y-auto">
                {currentSection?.explanation_script}
              </p>
            )}
          </div>
        </div>

        {/* Visual Panel (if applicable) */}
        {hasVisual && (
          <div className="lg:col-span-2 bg-warm-900 rounded-2xl border border-warm-800/60 p-4 overflow-auto flex items-center justify-center">
            <VisualRenderer section={currentSection} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-4 bg-warm-900 p-4 rounded-xl border border-warm-800/60">
        <button
          onClick={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
          disabled={currentSectionIndex === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-warm-300 hover:text-cream-100 disabled:opacity-40 transition-colors"
        >
          <SkipBack className="w-4 h-4" /> Previous
        </button>

        {/* Section dots */}
        <div className="flex gap-1.5">
          {sections.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSectionIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSectionIndex ? "w-8 bg-pencil-500" : idx < currentSectionIndex ? "w-2 bg-pencil-500/40" : "w-2 bg-warm-700"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {currentQuestion && (
            <button onClick={() => setShowCheckpoint(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-pencil-400 hover:text-pencil-300 transition-colors">
              <HelpCircle className="w-4 h-4" /> Checkpoint
            </button>
          )}
          <button
            onClick={() => setCurrentSectionIndex(Math.min(sections.length - 1, currentSectionIndex + 1))}
            disabled={currentSectionIndex === sections.length - 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-pencil-400 hover:text-pencil-300 disabled:opacity-40 transition-colors"
          >
            Next <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default LessonPlayer;
