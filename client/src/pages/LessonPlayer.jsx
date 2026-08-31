import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, PlayCircle, SkipForward, SkipBack, Loader2, HelpCircle } from "lucide-react";
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

  // In a real app, you would fetch from the backend:
  // /api/lessons/:id
  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await fetch(`/api/lessons/${id}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
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
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Error loading lesson</h2>
        <p className="text-gray-400">{error || "Lesson not found"}</p>
      </div>
    );
  }

  const sections = lesson.plan.sections || [];
  const currentSection = sections[currentSectionIndex];

  // Reset checkpoint state when section changes
  useEffect(() => {
    setShowCheckpoint(false);
    setEvaluationResult(null);
    setCurrentQuestion(currentSection?.checkpoint_question || null);
  }, [currentSectionIndex, currentSection]);

  const handleMediaEnded = () => {
    if (currentQuestion) {
      setShowCheckpoint(true);
    }
  };

  const handleAnswerSubmit = async (answer) => {
    setEvalLoading(true);
    try {
      const res = await fetch(`/api/lessons/${id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          sectionIndex: currentSectionIndex,
          question: currentQuestion.question,
          options: currentQuestion.options,
          studentAnswer: answer
        })
      });

      if (!res.ok) throw new Error("Failed to evaluate answer");
      const data = await res.json();
      setEvaluationResult(data.evaluation);
    } catch (err) {
      alert("Error evaluating answer: " + err.message);
    } finally {
      setEvalLoading(false);
    }
  };

  const handleContinue = () => {
    if (evaluationResult?.decision === "reinforce" && evaluationResult?.follow_up_question) {
      // Show the follow up question
      setCurrentQuestion(evaluationResult.follow_up_question);
      setEvaluationResult(null);
    } else {
      // Passed! Proceed to next section or hide checkpoint
      setShowCheckpoint(false);
      if (currentSectionIndex < sections.length - 1) {
        setCurrentSectionIndex(currentSectionIndex + 1);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate("/lesson")}
          className="p-2 rounded-full hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{lesson.title}</h2>
          <p className="text-sm text-gray-400">
            Section {currentSectionIndex + 1} of {sections.length}: {currentSection.section_title}
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[#0f1117] rounded-2xl border border-gray-800 overflow-hidden relative">
        {/* Main Content: Either Visual or Video */}
        {currentSection.visual_type && currentSection.visual_type !== "none" ? (
          <div className="w-full h-full p-4 relative">
            <VisualRenderer section={currentSection} />
            
            {/* PIP Video Overlay */}
            <div className="absolute bottom-4 right-4 w-64 aspect-video bg-black rounded-lg shadow-2xl border border-gray-700 overflow-hidden z-10">
              {currentSection.render_status === "ready" && currentSection.video_url ? (
                <video src={currentSection.video_url} controls autoPlay onEnded={handleMediaEnded} className="w-full h-full object-cover" />
              ) : currentSection.render_status === "failed" ? (
                 <div className="flex items-center justify-center w-full h-full text-xs text-red-400 p-2 text-center bg-gray-900">
                   Avatar Failed
                 </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900">
                   <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                   <span className="text-xs text-gray-400">Rendering Avatar...</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col relative">
            {currentSection.render_status === "ready" && currentSection.video_url ? (
              <video src={currentSection.video_url} controls autoPlay onEnded={handleMediaEnded} className="w-full h-full object-cover" />
            ) : currentSection.render_status === "failed" ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <h3 className="text-xl font-bold text-white mb-4">{currentSection.section_title}</h3>
                <p className="text-gray-400 max-w-2xl text-lg leading-relaxed">{currentSection.explanation_script}</p>
                {currentSection.audio_url && <audio src={currentSection.audio_url} controls onEnded={handleMediaEnded} className="mt-8" />}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                <p className="text-gray-400 font-medium">Generating Avatar Video...</p>
              </div>
            )}
          </div>
        )}

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

      {/* Controls */}
      <div className="flex items-center justify-between mt-6 bg-[#1e2029] p-4 rounded-xl border border-gray-800">
        <button 
          onClick={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
          disabled={currentSectionIndex === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white disabled:opacity-50 transition-colors"
        >
          <SkipBack className="w-4 h-4" /> Previous
        </button>
        
        <div className="flex gap-1">
          {sections.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1.5 w-8 rounded-full ${idx === currentSectionIndex ? 'bg-indigo-500' : idx < currentSectionIndex ? 'bg-indigo-900' : 'bg-gray-800'}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {currentQuestion && (
            <button
              onClick={() => setShowCheckpoint(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors"
            >
              <HelpCircle className="w-4 h-4" /> Take Checkpoint
            </button>
          )}

          <button 
            onClick={() => setCurrentSectionIndex(Math.min(sections.length - 1, currentSectionIndex + 1))}
            disabled={currentSectionIndex === sections.length - 1 || (currentQuestion && !evaluationResult?.is_correct)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
          >
            Next <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default LessonPlayer;
