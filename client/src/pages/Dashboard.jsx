import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BookOpen, TrendingUp, Target, Zap, ArrowRight, Loader2,
  Clock, CheckCircle2, AlertTriangle, GraduationCap, Sparkles, Calendar
} from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { "Authorization": `Bearer ${token}` };

    Promise.allSettled([
      fetch("/api/lessons", { headers }).then(r => r.json()),
      fetch("/api/progress", { headers }).then(r => r.json())
    ]).then(([lessonRes, progressRes]) => {
      if (lessonRes.status === "fulfilled" && lessonRes.value.lessons) {
        setLessons(lessonRes.value.lessons);
      } else {
        setError("Failed to load lessons");
      }
      if (progressRes.status === "fulfilled" && progressRes.value.profile) {
        setProgress(progressRes.value);
      } else {
        setError("Failed to load progress");
      }
    }).catch(() => {
      setError("Service Unavailable: Could not connect to backend");
    }).finally(() => setLoading(false));
  }, []);

  const profile = progress?.profile || {};
  const scores = progress?.scoresOverTime || [];
  const recentLessons = lessons.slice(0, 3);
  const suggestedNext = progress?.suggestedNextTopic;

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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-board-800 to-board-900 border border-board-700/50 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pencil-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-2 text-pencil-400 mb-3">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Your Learning Hub</span>
          </div>
          <h1 className="text-3xl font-black text-cream-100 mb-2">Welcome back, Learner!</h1>
          <p className="text-warm-300 max-w-xl">Continue your personalized learning journey. Your AI tutor adapts to your pace and understanding.</p>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => navigate("/upload")}
              className="flex items-center gap-2 px-5 py-2.5 bg-pencil-500 hover:bg-pencil-600 text-warm-950 font-bold rounded-xl transition-colors shadow-lg shadow-pencil-500/20"
            >
              <Zap className="w-4 h-4" /> Start New Lesson
            </button>
            <button
              onClick={() => navigate("/lesson")}
              className="flex items-center gap-2 px-5 py-2.5 bg-warm-800/60 hover:bg-warm-700/60 text-cream-200 font-semibold rounded-xl transition-colors border border-warm-700/30"
            >
              <BookOpen className="w-4 h-4" /> My Lessons
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fade-in-up-delay">
        <StatCard icon={BookOpen} label="Topics Studied" value={profile.pastTopics?.length || 0} color="ink" />
        <StatCard icon={CheckCircle2} label="Strong Concepts" value={profile.strongConcepts?.length || 0} color="leaf" />
        <StatCard icon={AlertTriangle} label="Weak Areas" value={profile.weakConcepts?.length || 0} color="pencil" />
        <StatCard icon={GraduationCap} label="Assessments" value={scores.length || 0} color="eraser" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Chart */}
        <div className="lg:col-span-2 bg-warm-900 rounded-2xl border border-warm-800/60 p-6">
          <h2 className="text-lg font-bold text-cream-100 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pencil-400" />
            Performance Over Time
          </h2>
          <div className="flex items-stretch gap-4 h-48 px-2 overflow-x-auto pb-2 custom-scrollbar">
            {scores.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-warm-500 text-sm">
                No assessment data yet.
              </div>
            ) : (
              [...scores].reverse().map((s, i) => {
                const height = s.percentage;
                const color = s.percentage >= 80 ? "bg-leaf-500" : s.percentage >= 50 ? "bg-pencil-500" : "bg-eraser-500";
                return (
                  <div key={i} className="w-32 flex-shrink-0 flex flex-col justify-end items-center gap-2 h-full">
                    <span className="text-xs font-bold text-warm-300">{Math.round(s.percentage)}%</span>
                    <div className={`w-full rounded-t-lg ${color} transition-all duration-700 ease-out min-h-[4px]`} style={{ height: `${height}%` }} />
                    <span className="text-[10px] text-warm-500 truncate w-full text-center" title={s.topic}>{s.topic}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Lessons */}
        <div className="bg-warm-900 rounded-2xl border border-warm-800/60 p-6">
          <h2 className="text-lg font-bold text-cream-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-pencil-400" />
            Recent Lessons
          </h2>
          {recentLessons.length === 0 ? (
            <p className="text-warm-500 text-sm">No lessons yet. Start your first lesson!</p>
          ) : (
            <div className="space-y-3">
              {recentLessons.map(l => (
                <Link key={l._id} to={`/lesson/${l._id}/play`} className="block bg-warm-800/40 hover:bg-warm-800/70 border border-warm-700/20 rounded-xl p-3 transition-colors">
                  <p className="text-sm font-semibold text-cream-200 line-clamp-1">{l.title}</p>
                  <p className="text-xs text-warm-400 mt-1">{l.topic} · {l.availableTimeMinutes}m</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggested Next Topic CTA */}
      {suggestedNext && (
        <div className="bg-gradient-to-r from-ink-700/30 to-ink-600/20 border border-ink-600/30 rounded-2xl p-6 flex items-center justify-between animate-fade-in-up-delay">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-5 h-5 text-pencil-400" />
              <span className="text-sm font-semibold text-ink-500 uppercase tracking-wider">Continue Learning</span>
            </div>
            <h3 className="text-xl font-bold text-cream-100">{suggestedNext}</h3>
            <p className="text-sm text-warm-400 mt-1">Recommended based on your recent performance.</p>
          </div>
          <button
            onClick={() => navigate(`/upload?topic=${encodeURIComponent(suggestedNext)}`)}
            className="flex items-center gap-2 px-6 py-3 bg-pencil-500 hover:bg-pencil-600 text-warm-950 font-bold rounded-xl transition-colors shadow-lg shadow-pencil-500/20"
          >
            Start <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    ink: "from-ink-700/20 to-ink-600/10 border-ink-600/20 text-ink-500",
    leaf: "from-leaf-600/20 to-leaf-500/10 border-leaf-500/20 text-leaf-400",
    pencil: "from-pencil-600/20 to-pencil-500/10 border-pencil-500/20 text-pencil-400",
    eraser: "from-eraser-500/20 to-eraser-400/10 border-eraser-400/20 text-eraser-400",
  };
  const c = colorMap[color] || colorMap.ink;
  return (
    <div className={`bg-gradient-to-br ${c} border rounded-2xl p-5`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs text-warm-400 font-medium">{label}</span>
      </div>
      <p className="text-3xl font-black text-cream-100">{value}</p>
    </div>
  );
}

export default Dashboard;
