import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send, MessageCircle, ChevronDown, ChevronUp, Loader2, Brain, Lightbulb, HelpCircle, Sparkles } from "lucide-react";
import useSpeechRecognition from "../hooks/useSpeechRecognition";

/**
 * TeacherChat — Persistent interaction panel for the live AI Teacher.
 * Students can type or speak questions anytime during the lesson.
 */
export default function TeacherChat({
  onSendMessage,
  conversationHistory,
  isProcessing,
  teacherState,
  sessionState,
  lastResponse,
  language = "en",
}) {
  const [inputText, setInputText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Map language codes to Speech API locales
  const langMap = { en: "en-US", hi: "hi-IN", es: "es-ES", fr: "fr-FR", de: "de-DE", mr: "mr-IN" };
  const speechLang = langMap[language?.substring(0, 2)] || "en-US";

  const { isListening, transcript, isSupported, startListening, stopListening } = useSpeechRecognition({ language: speechLang });

  // When speech transcript updates, fill the input
  useEffect(() => {
    if (transcript) setInputText(transcript);
  }, [transcript]);

  // Auto-send when speech recognition finishes with text
  useEffect(() => {
    if (!isListening && transcript && transcript.trim()) {
      handleSend(transcript.trim());
    }
  }, [isListening]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current && isExpanded) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationHistory, isExpanded]);

  const handleSend = (text) => {
    const msg = text || inputText.trim();
    if (!msg || isProcessing) return;
    onSendMessage(msg);
    setInputText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Teacher state indicator
  const stateConfig = {
    IDLE: { label: "Ready", color: "bg-leaf-400", pulse: false },
    LISTENING: { label: "Listening...", color: "bg-sky-400", pulse: true },
    THINKING: { label: "Thinking...", color: "bg-pencil-400", pulse: true },
    RESPONDING: { label: "Responding...", color: "bg-ink-400", pulse: true },
  };
  const currentState = stateConfig[teacherState] || stateConfig.IDLE;

  // Intent icon mapping
  const intentIcons = {
    confusion: <HelpCircle className="w-3.5 h-3.5 text-eraser-400" />,
    misconception: <Brain className="w-3.5 h-3.5 text-eraser-400" />,
    question: <MessageCircle className="w-3.5 h-3.5 text-pencil-400" />,
    correct_understanding: <Sparkles className="w-3.5 h-3.5 text-leaf-400" />,
    request_for_example: <Lightbulb className="w-3.5 h-3.5 text-pencil-400" />,
  };

  // Understanding level from session state
  const currentConcept = sessionState?.current_concept || "";
  const mastery = sessionState?.concept_mastery?.[currentConcept];
  const masteryPercent = mastery != null ? Math.round(mastery * 100) : null;

  return (
    <div className="bg-warm-900 rounded-2xl border border-warm-800/60 overflow-hidden transition-all duration-300">
      {/* Header bar — always visible */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-warm-800/40 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* State indicator dot */}
          <span className={`w-2.5 h-2.5 rounded-full ${currentState.color} ${currentState.pulse ? "animate-pulse" : ""}`} />
          <span className="text-sm font-medium text-cream-200">
            AI Teacher {currentState.label !== "Ready" ? `· ${currentState.label}` : ""}
          </span>
          {currentConcept && (
            <span className="text-xs text-warm-500 hidden sm:inline">· {currentConcept}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Understanding bar */}
          {masteryPercent != null && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-warm-500">Understanding:</span>
              <div className="w-20 h-1.5 bg-warm-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    masteryPercent >= 70 ? "bg-leaf-400" : masteryPercent >= 40 ? "bg-pencil-400" : "bg-eraser-400"
                  }`}
                  style={{ width: `${masteryPercent}%` }}
                />
              </div>
              <span className="text-xs text-warm-400 font-mono">{masteryPercent}%</span>
            </div>
          )}
          {isExpanded ? <ChevronDown className="w-4 h-4 text-warm-500" /> : <ChevronUp className="w-4 h-4 text-warm-500" />}
        </div>
      </div>

      {/* Expandable conversation + input area */}
      {isExpanded && (
        <div className="border-t border-warm-800/40 animate-fade-in-up">
          {/* Conversation History */}
          {conversationHistory.length > 0 && (
            <div className="max-h-48 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-warm-700">
              {conversationHistory.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.role === "student" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "teacher" && (
                    <div className="w-6 h-6 rounded-full bg-pencil-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain className="w-3.5 h-3.5 text-pencil-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.role === "student"
                        ? "bg-ink-600/30 text-cream-200 border border-ink-500/20"
                        : "bg-warm-800/60 text-cream-300 border border-warm-700/40"
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.role === "teacher" && msg.intent && (
                      <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-warm-700/30">
                        {intentIcons[msg.intent] || <MessageCircle className="w-3.5 h-3.5 text-warm-500" />}
                        <span className="text-[10px] text-warm-500 uppercase tracking-wider">{msg.strategy?.replace(/_/g, " ") || msg.intent}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Follow-up question from teacher */}
          {lastResponse?.follow_up_question && (
            <div className="mx-4 mb-2 p-2.5 bg-pencil-500/10 border border-pencil-500/20 rounded-xl">
              <p className="text-xs text-pencil-400 font-semibold uppercase tracking-wider mb-1">Teacher asks:</p>
              <p className="text-sm text-cream-200">{lastResponse.follow_up_question}</p>
            </div>
          )}

          {/* Input area */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-warm-800/40">
            {/* Mic button */}
            {isSupported && (
              <button
                onClick={handleMicToggle}
                className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                  isListening
                    ? "bg-eraser-500/20 text-eraser-400 border border-eraser-400/30 animate-pulse"
                    : "bg-warm-800/40 text-warm-400 hover:text-cream-200 hover:bg-warm-800/60 border border-warm-700/40"
                }`}
                title={isListening ? "Stop recording" : "Ask by voice"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            {/* Text input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask the teacher anything..."}
                disabled={isProcessing}
                className="w-full bg-warm-800/40 border border-warm-700/40 rounded-xl px-4 py-2.5 text-sm text-cream-200 placeholder-warm-500 focus:border-pencil-500/60 focus:ring-1 focus:ring-pencil-500/30 outline-none disabled:opacity-50 transition-colors"
              />
            </div>

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={isProcessing || !inputText.trim()}
              className="p-2.5 bg-pencil-500 hover:bg-pencil-600 text-warm-950 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0 shadow-lg shadow-pencil-500/10"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
