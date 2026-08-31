import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, TrendingUp, BookOpen, AlertTriangle, CheckCircle2,
  ArrowRight, Loader2, Target, Brain, Zap
} from "lucide-react";

function Progress() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch("/api/progress", {
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (!res.ok) throw new Error("Failed to load progress");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
        // Use mock data for demo when backend isn't connected
        setData({
          profile: {
            pastTopics: ["Ohm's Law", "Circuit Analysis", "Photosynthesis"],
            weakConcepts: ["Resistance and wire thickness", "Kirchhoff's Voltage Law"],
            strongConcepts: ["Ohm's Law formula", "Basic circuit concepts", "Series circuits"],
            learningHistory: []
          },
          scoresOverTime: [
            { date: "2026-08-25", topic: "Ohm's Law", percentage: 85 },
            { date: "2026-08-27", topic: "Circuit Analysis", percentage: 60 },
            { date: "2026-08-29", topic: "Photosynthesis", percentage: 92 },
            { date: "2026-08-31", topic: "Kirchhoff's Laws", percentage: 45 },
          ],
          suggestedNextTopic: "Kirchhoff's Circuit Laws",
          assessments: [
            {
              _id: "a1", score: 3, maxScore: 4, percentage: 75,
              lesson: { title: "Ohm's Law", topic: "Physics" },
              strongConcepts: ["V=IR"], weakConcepts: ["Wire resistance"],
              completedAt: "2026-08-25T10:00:00Z"
            },
            {
              _id: "a2", score: 2, maxScore: 3, percentage: 66.7,
              lesson: { title: "Circuit Analysis", topic: "Physics" },
              strongConcepts: ["Series circuits"], weakConcepts: ["Parallel circuits"],
              completedAt: "2026-08-27T14:00:00Z"
            },
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const profile = data?.profile || {};
  const scores = data?.scoresOverTime || [];
  const suggestedNext = data?.suggestedNextTopic;

  // Compute max bar height
  const maxPercent = Math.max(...scores.map(s => s.percentage || 0), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-indigo-500" />
          Progress Dashboard
        </h1>
        <p className="text-gray-400 mt-1">Track your learning journey and identify areas for improvement.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-800/20 border border-indigo-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span className="text-sm text-gray-400 font-medium">Topics Studied</span>
          </div>
          <p className="text-3xl font-bold text-white">{profile.pastTopics?.length || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-gray-400 font-medium">Strong Concepts</span>
          </div>
          <p className="text-3xl font-bold text-white">{profile.strongConcepts?.length || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-sm text-gray-400 font-medium">Weak Areas</span>
          </div>
          <p className="text-3xl font-bold text-white">{profile.weakConcepts?.length || 0}</p>
        </div>
      </div>

      {/* Scores Over Time Chart */}
      <div className="bg-[#0f1117] rounded-2xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          Scores Over Time
        </h2>
        {scores.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Complete assessments to see your score history.</p>
        ) : (
          <div className="flex items-end gap-3 h-48 px-2">
            {scores.map((s, i) => {
              const height = (s.percentage / maxPercent) * 100;
              const color = s.percentage >= 80 ? "bg-emerald-500" : s.percentage >= 50 ? "bg-amber-500" : "bg-red-500";
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-gray-300">{Math.round(s.percentage)}%</span>
                  <div
                    className={`w-full rounded-t-lg ${color} transition-all duration-500 ease-out min-h-[4px]`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-gray-500 truncate w-full text-center">{s.topic}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two columns: Strong/Weak Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strong Concepts */}
        <div className="bg-[#0f1117] rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-400" />
            Strong Concepts
          </h2>
          {(profile.strongConcepts?.length || 0) === 0 ? (
            <p className="text-gray-500 text-sm">No strong concepts identified yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.strongConcepts.map((c, i) => (
                <span key={i} className="px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/40 text-emerald-300 text-sm rounded-full">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Weak Areas */}
        <div className="bg-[#0f1117] rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            Areas to Improve
          </h2>
          {(profile.weakConcepts?.length || 0) === 0 ? (
            <p className="text-gray-500 text-sm">No weak areas identified. Keep it up!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.weakConcepts.map((c, i) => (
                <span key={i} className="px-3 py-1.5 bg-amber-900/30 border border-amber-700/40 text-amber-300 text-sm rounded-full">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Topics Studied */}
      <div className="bg-[#0f1117] rounded-2xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          Topics Studied
        </h2>
        {(profile.pastTopics?.length || 0) === 0 ? (
          <p className="text-gray-500 text-sm">Start a lesson to begin tracking topics.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.pastTopics.map((t, i) => (
              <span key={i} className="px-3 py-1.5 bg-indigo-900/30 border border-indigo-700/40 text-indigo-300 text-sm rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Continue Learning CTA */}
      {suggestedNext && (
        <div className="bg-gradient-to-r from-indigo-900/60 to-violet-900/60 border border-indigo-700/40 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-medium text-indigo-300">Suggested Next Topic</span>
            </div>
            <h3 className="text-xl font-bold text-white">{suggestedNext}</h3>
            <p className="text-sm text-gray-400 mt-1">Based on your latest assessment results.</p>
          </div>
          <button
            onClick={() => navigate(`/lesson?next=${encodeURIComponent(suggestedNext)}`)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
          >
            Continue Learning <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Progress;
