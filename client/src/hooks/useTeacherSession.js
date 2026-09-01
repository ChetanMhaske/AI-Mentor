import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Custom hook managing the live teacher session:
 * - Session creation
 * - Sending messages to the AI teacher
 * - Receiving structured teaching decisions
 * - TTS playback of responses
 * - Conversation history
 * - Session state
 */
export default function useTeacherSession({ lessonId, lesson }) {
  const [sessionId, setSessionId] = useState(null);
  const [sessionState, setSessionState] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [teacherState, setTeacherState] = useState("IDLE"); // IDLE, LISTENING, THINKING, RESPONDING
  const [dynamicVisual, setDynamicVisual] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const sessionStartedRef = useRef(false);

  const token = localStorage.getItem("token");

  // Start session when lesson loads
  useEffect(() => {
    if (!lessonId || !lesson || sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    const startSession = async () => {
      try {
        const res = await fetch("/api/teacher/session/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lessonId }),
        });

        if (!res.ok) {
          console.warn("Failed to start teacher session:", res.status);
          return;
        }

        const data = await res.json();
        setSessionId(data.session_id);
        setSessionState(data.session_state);
      } catch (err) {
        console.warn("Teacher session start failed:", err);
      }
    };

    startSession();
  }, [lessonId, lesson, token]);

  /**
   * Send a message to the AI teacher and handle the response.
   */
  const sendMessage = useCallback(
    async (text, currentSectionIndex = 0) => {
      if (!sessionId || !text.trim() || isProcessing) return null;

      setIsProcessing(true);
      setTeacherState("THINKING");
      setError(null);

      // Add student message to history
      setConversationHistory((prev) => [
        ...prev,
        { role: "student", text, timestamp: Date.now() },
      ]);

      try {
        const res = await fetch("/api/teacher/interact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId,
            studentMessage: text,
            currentSectionIndex,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Interaction failed");
        }

        const data = await res.json();
        setTeacherState("RESPONDING");

        // Add teacher response to history
        setConversationHistory((prev) => [
          ...prev,
          {
            role: "teacher",
            text: data.response,
            intent: data.intent,
            strategy: data.teaching_strategy,
            timestamp: Date.now(),
          },
        ]);

        // Update session state
        if (data.session_state) {
          setSessionState(data.session_state);
        }

        // Handle dynamic visual
        if (data.visual_required && data.visual_data) {
          setDynamicVisual({
            visual_type: data.visual_type,
            visual_spec: data.visual_data,
          });
        }

        setLastResponse(data);

        // Generate TTS for teacher response (non-blocking)
        generateTTS(data.response);

        return data;
      } catch (err) {
        console.error("Teacher interaction error:", err);
        setError(err.message);

        // Add error message to history
        setConversationHistory((prev) => [
          ...prev,
          {
            role: "teacher",
            text: "I'm having a moment — could you try asking that again?",
            intent: "error",
            timestamp: Date.now(),
          },
        ]);

        return null;
      } finally {
        setIsProcessing(false);
        setTimeout(() => setTeacherState("IDLE"), 500);
      }
    },
    [sessionId, isProcessing, token]
  );

  /**
   * Generate TTS and play the audio.
   */
  const generateTTS = useCallback(
    async (text) => {
      try {
        const res = await fetch("/api/teacher/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: text.substring(0, 500), // Limit TTS length for speed
            language: lesson?.language || "en",
          }),
        });

        if (!res.ok) return;

        const data = await res.json();
        if (data.audio_url && audioRef.current) {
          audioRef.current.src = data.audio_url;
          audioRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn("TTS failed (non-fatal):", err);
      }
    },
    [token, lesson?.language]
  );

  /**
   * Clear the dynamic visual overlay.
   */
  const clearDynamicVisual = useCallback(() => {
    setDynamicVisual(null);
  }, []);

  return {
    sessionId,
    sessionState,
    conversationHistory,
    isProcessing,
    teacherState,
    dynamicVisual,
    lastResponse,
    error,
    audioRef,
    sendMessage,
    clearDynamicVisual,
    setTeacherState,
  };
}
