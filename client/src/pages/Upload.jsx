import { useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  UploadCloud, FileText, Loader2, Sparkles, BookOpen, Clock,
  Globe, GraduationCap, ChevronRight, X, CheckCircle2, Lightbulb
} from "lucide-react";

const LEVELS = ["beginner", "intermediate", "advanced"];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "hinglish", label: "Hinglish" },
  { code: "es", label: "Spanish" },
];
const TIME_OPTIONS = [5, 15, 20, 30, 45, 60];

function Upload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  // Step state
  const [step, setStep] = useState(1); // 1: Setup, 2: Source, 3: Generating

  // Learner preferences
  const [level, setLevel] = useState("beginner");
  const [language, setLanguage] = useState("en");
  const [time, setTime] = useState(20);
  const [objective, setObjective] = useState("");

  // Source
  const [mode, setMode] = useState("topic"); // "topic" or "upload"
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // State
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      setMode("upload");
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setMode("upload");
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setStep(3);
    const token = localStorage.getItem("token");

    try {
      let materialId = null;

      // Upload file first if in upload mode
      if (mode === "upload" && file) {
        setLoadingMsg("Extracting text and building knowledge base...");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", file.name);

        const uploadRes = await fetch("/api/materials/upload", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload material");
        const uploadData = await uploadRes.json();
        materialId = uploadData.material?._id;
      }

      // Generate lesson plan
      setLoadingMsg("Generating personalized lesson plan...");
      const lessonRes = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          material_id: materialId,
          topic: mode === "topic" ? topic : null,
          learner_level: level,
          language,
          available_time_minutes: time,
          learning_objective: objective || `Learn about ${topic || file?.name || "this topic"}`,
          preferred_style: "visual",
        }),
      });

      if (!lessonRes.ok) {
        const errData = await lessonRes.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to generate lesson");
      }
      const lessonData = await lessonRes.json();

      // Navigate to the lesson player
      navigate(`/lesson/${lessonData.lesson._id}/play`);
    } catch (err) {
      setError(err.message);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-pencil-400 mb-2">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Create Lesson</span>
        </div>
        <h1 className="text-3xl font-black text-cream-100">Start a New Lesson</h1>
        <p className="text-warm-400 mt-1">Set your preferences and let your AI tutor prepare a personalized lesson.</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {["Preferences", "Content Source", "Generating"].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step > i + 1 ? "bg-leaf-500 text-white" :
              step === i + 1 ? "bg-pencil-500 text-warm-950" : "bg-warm-800 text-warm-500"
            }`}>
              {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${step === i + 1 ? "text-cream-200" : "text-warm-500"}`}>{s}</span>
            {i < 2 && <ChevronRight className="w-4 h-4 text-warm-700" />}
          </div>
        ))}
      </div>

      {/* Step 1: Learner Preferences */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Level */}
          <div>
            <label className="text-sm font-semibold text-cream-200 mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-pencil-400" /> Your Level
            </label>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold capitalize transition-all border ${
                    level === l
                      ? "bg-pencil-500/15 border-pencil-500/40 text-pencil-400"
                      : "bg-warm-900 border-warm-700/30 text-warm-400 hover:border-warm-600"
                  }`}
                >{l}</button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="text-sm font-semibold text-cream-200 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-pencil-400" /> Teaching Language
            </label>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => setLanguage(l.code)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all border ${
                    language === l.code
                      ? "bg-pencil-500/15 border-pencil-500/40 text-pencil-400"
                      : "bg-warm-900 border-warm-700/30 text-warm-400 hover:border-warm-600"
                  }`}
                >{l.label}</button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="text-sm font-semibold text-cream-200 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-pencil-400" /> Available Time
            </label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {TIME_OPTIONS.map(t => (
                <button key={t} onClick={() => setTime(t)}
                  className={`py-2.5 px-5 rounded-xl text-sm font-semibold transition-all border ${
                    time === t
                      ? "bg-pencil-500/15 border-pencil-500/40 text-pencil-400"
                      : "bg-warm-900 border-warm-700/30 text-warm-400 hover:border-warm-600"
                  }`}
                >{t} min</button>
              ))}
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="text-sm font-semibold text-cream-200 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-pencil-400" /> Learning Objective <span className="text-warm-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={objective}
              onChange={e => setObjective(e.target.value)}
              placeholder="e.g. Understand how neural networks learn through backpropagation"
              className="w-full mt-2 bg-warm-900 border border-warm-700/30 rounded-xl px-4 py-3 text-cream-200 placeholder-warm-600 focus:border-pencil-500/50 focus:ring-1 focus:ring-pencil-500/30 outline-none transition-colors text-sm"
            />
          </div>

          <button onClick={() => setStep(2)} className="w-full py-3.5 bg-pencil-500 hover:bg-pencil-600 text-warm-950 font-bold rounded-xl transition-colors shadow-lg shadow-pencil-500/20 flex items-center justify-center gap-2">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Content Source */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in-up">
          {error && (
            <div className="p-4 bg-eraser-500/10 border border-eraser-500/20 rounded-xl text-eraser-400 text-sm">{error}</div>
          )}

          {/* Mode Toggle */}
          <div className="flex bg-warm-900 rounded-xl border border-warm-700/30 p-1">
            <button onClick={() => setMode("topic")} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === "topic" ? "bg-pencil-500/15 text-pencil-400" : "text-warm-400"}`}>
              Just a Topic
            </button>
            <button onClick={() => setMode("upload")} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === "upload" ? "bg-pencil-500/15 text-pencil-400" : "text-warm-400"}`}>
              Upload Material
            </button>
          </div>

          {mode === "topic" ? (
            <div>
              <label className="text-sm font-semibold text-cream-200 mb-2 block">What would you like to learn?</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Ohm's Law, React Hooks, Photosynthesis..."
                className="w-full bg-warm-900 border border-warm-700/30 rounded-xl px-4 py-3.5 text-cream-200 placeholder-warm-600 focus:border-pencil-500/50 focus:ring-1 focus:ring-pencil-500/30 outline-none text-sm"
                autoFocus
              />
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-pencil-500 bg-pencil-500/5"
                  : file
                    ? "border-leaf-500/40 bg-leaf-500/5"
                    : "border-warm-700/40 bg-warm-900/50 hover:border-warm-600"
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx,.txt" onChange={handleFileSelect} className="hidden" />
              {file ? (
                <div className="flex flex-col items-center">
                  <FileText className="w-10 h-10 text-leaf-400 mb-3" />
                  <p className="text-cream-200 font-semibold">{file.name}</p>
                  <p className="text-warm-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-eraser-400 mt-3 hover:underline flex items-center gap-1">
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="w-10 h-10 text-warm-500 mb-3" />
                  <p className="text-cream-200 font-semibold">Drop your file here or click to browse</p>
                  <p className="text-warm-500 text-sm mt-1">Supports PDF, DOCX, PPTX, and TXT</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-6 py-3 bg-warm-800/60 hover:bg-warm-700/60 text-cream-200 font-semibold rounded-xl transition-colors border border-warm-700/30">
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || (mode === "topic" ? !topic.trim() : !file)}
              className="flex-1 py-3 bg-pencil-500 hover:bg-pencil-600 text-warm-950 font-bold rounded-xl transition-colors shadow-lg shadow-pencil-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Generate Lesson
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Loading */}
      {step === 3 && (
        <div className="text-center py-16 animate-fade-in-up">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 rounded-full bg-pencil-500/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-pencil-400 animate-spin" />
            </div>
            <div className="absolute -inset-3 rounded-full border-2 border-pencil-500/20 animate-pulse-soft" />
          </div>
          <h2 className="text-2xl font-bold text-cream-100 mb-2">Creating Your Lesson</h2>
          <p className="text-warm-400 animate-pulse-soft">{loadingMsg || "Preparing your personalized experience..."}</p>
          <div className="mt-8 max-w-sm mx-auto space-y-3">
            <ProgressStep label="Analyzing content" done={loadingMsg.includes("knowledge") || loadingMsg.includes("lesson")} />
            <ProgressStep label="Building knowledge base" done={loadingMsg.includes("lesson")} />
            <ProgressStep label="Generating lesson plan" done={false} active={loadingMsg.includes("lesson")} />
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressStep({ label, done, active }) {
  return (
    <div className="flex items-center gap-3 text-left">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        done ? "bg-leaf-500" : active ? "bg-pencil-500/30" : "bg-warm-800"
      }`}>
        {done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : active ? <Loader2 className="w-3.5 h-3.5 text-pencil-400 animate-spin" /> : null}
      </div>
      <span className={`text-sm ${done ? "text-leaf-400" : active ? "text-pencil-400" : "text-warm-600"}`}>{label}</span>
    </div>
  );
}

export default Upload;
