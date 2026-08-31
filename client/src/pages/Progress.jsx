import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, BookOpen, AlertTriangle, CheckCircle2,
  ArrowRight, Loader2, Target, Brain, Zap, BarChart3, Calendar
} from "lucide-react";

function Progress() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch("/api/progress", {
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (!res.ok) throw new Error("Failed to load progress");
        setData(await res.json());
      } catch {
        setError("Service Unavailable: Could not connect to backend");
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-pencil-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-cream-100 font-semibold">{error}</p>
        <p className="text-warm-400">Please ensure the backend services are running.</p>
      </div>
    );
  }

  const profile = data?.profile || {};
  const scores = data?.scoresOverTime || [];
  const suggestedNext = data?.suggestedNextTopic;
  const history = profile.learningHistory || [];
  const maxPercent = Math.max(...scores.map(s => s.percentage || 0), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-pencil-400 mb-2">
          <BarChart3 className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Progress</span>
        </div>
        <h1 className="text-3xl font-black text-cream-100">Your Learning Journey</h1>
        <p className="text-warm-400 mt-1">Track your growth and identify areas to improve.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-ink-700/20 to-ink-600/10 border border-ink-600/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-ink-500" />
            <span className="text-xs text-warm-400 font-medium">Topics Studied</span>
          </div>
          <p className="text-3xl font-black text-cream-100">{profile.pastTopics?.length || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-leaf-600/20 to-leaf-500/10 border border-leaf-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-leaf-400" />
            <span className="text-xs text-warm-400 font-medium">Strong Concepts</span>
          </div>
          <p className="text-3xl font-black text-cream-100">{profile.strongConcepts?.length || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-pencil-600/20 to-pencil-500/10 border border-pencil-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-pencil-400" />
            <span className="text-xs text-warm-400 font-medium">Weak Areas</span>
          </div>
          <p className="text-3xl font-black text-cream-100">{profile.weakConcepts?.length || 0}</p>
        </div>
      </div>

      {/* Score Chart */}
      <div className="bg-warm-900 rounded-2xl border border-warm-800/60 p-6">
        <h2 className="text-lg font-bold text-cream-100 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-pencil-400" />
          Scores Over Time
        </h2>
        {scores.length === 0 ? (
          <p className="text-warm-500 text-center py-8">Complete assessments to see your score history.</p>
        ) : (
          <div className="flex items-end gap-3 h-48 px-2">
            {scores.map((s, i) => {
              const height = (s.percentage / maxPercent) * 100;
              const color = s.percentage >= 80 ? "bg-leaf-500" : s.percentage >= 50 ? "bg-pencil-500" : "bg-eraser-500";
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-warm-300">{Math.round(s.percentage)}%</span>
                  <div className={`w-full rounded-t-lg ${color} transition-all duration-700 ease-out min-h-[4px]`} style={{ height: `${height}%` }} />
                  <span className="text-[10px] text-warm-500 truncate w-full text-center">{s.topic}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two columns: Strong/Weak Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-warm-900 rounded-2xl border border-warm-800/60 p-6">
          <h2 className="text-sm font-bold text-leaf-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4" /> Strong Concepts
          </h2>
          {(profile.strongConcepts?.length || 0) === 0 ? (
            <p className="text-warm-500 text-sm">No strong concepts identified yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.strongConcepts.map((c, i) => (
                <span key={i} className="px-3 py-1.5 bg-leaf-600/15 border border-leaf-500/20 text-leaf-400 text-xs rounded-full font-medium">{c}</span>
              ))}
            </div>
          )}
        </div>
        <div className="bg-warm-900 rounded-2xl border border-warm-800/60 p-6">
          <h2 className="text-sm font-bold text-eraser-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" /> Areas to Improve
          </h2>
          {(profile.weakConcepts?.length || 0) === 0 ? (
            <p className="text-warm-500 text-sm">No weak areas identified. Keep it up!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.weakConcepts.map((c, i) => (
                <span key={i} className="px-3 py-1.5 bg-eraser-500/15 border border-eraser-400/20 text-eraser-400 text-xs rounded-full font-medium">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Learning History / Resume Path */}
      <div className="bg-warm-900 rounded-2xl border border-warm-800/60 p-6">
        <h2 className="text-lg font-bold text-cream-100 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-pencil-400" />
          Learning History
        </h2>
        {history.length === 0 ? (
          <p className="text-warm-500 text-sm">Start studying to build your history.</p>
        ) : (
          <div className="space-y-3">
            {history.map((h, i) => {
              const scoreColor = h.percentage >= 80 ? "text-leaf-400 bg-leaf-600/15" : h.percentage >= 50 ? "text-pencil-400 bg-pencil-500/15" : "text-eraser-400 bg-eraser-500/15";
              return (
                <div key={i} className="flex items-center justify-between bg-warm-800/40 border border-warm-700/20 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-cream-200">{h.topic}</p>
                    <p className="text-xs text-warm-500 mt-0.5">{new Date(h.completedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${scoreColor}`}>
                    {Math.round(h.percentage)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Continue Learning CTA */}
      {suggestedNext && (
        <div className="bg-gradient-to-r from-board-800 to-board-900 border border-board-700/50 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-pencil-400" />
              <span className="text-xs font-semibold text-pencil-400 uppercase tracking-wider">Resume Path</span>
            </div>
            <h3 className="text-xl font-bold text-cream-100">{suggestedNext}</h3>
            <p className="text-sm text-warm-400 mt-1">Recommended based on your assessment results.</p>
          </div>
          <button
            onClick={() => navigate(`/upload?topic=${encodeURIComponent(suggestedNext)}`)}
            className="flex items-center gap-2 px-6 py-3 bg-pencil-500 hover:bg-pencil-600 text-warm-950 font-bold rounded-xl transition-colors shadow-lg shadow-pencil-500/20"
          >
            Continue Learning <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Progress;
