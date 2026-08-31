import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, PlayCircle, Loader2, Clock, Globe, BookText, ArrowRight } from "lucide-react";

function Lesson() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const res = await fetch("/api/lessons", {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to load lessons");
        }
        const data = await res.json();
        setLessons(data.lessons || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, []);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-pencil-400 mb-2">
            <BookText className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">My Library</span>
          </div>
          <h2 className="text-3xl font-black text-cream-100">Your Lessons</h2>
          <p className="text-warm-400 mt-1">Review and continue your generated AI-guided lessons.</p>
        </div>
        <button
          onClick={() => navigate("/upload")}
          className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-pencil-500 hover:bg-pencil-600 text-warm-950 font-bold rounded-xl transition-colors shadow-lg shadow-pencil-500/20"
        >
          Create New <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-10 h-10 animate-spin text-pencil-400" />
        </div>
      ) : error ? (
        <div className="p-4 bg-eraser-500/10 border border-eraser-500/20 rounded-xl text-eraser-400">
          {error}
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-20 bg-warm-900 rounded-3xl border border-warm-800/60">
          <BookOpen className="w-16 h-16 text-warm-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-cream-200 mb-2">Your library is empty</h3>
          <p className="text-warm-400 max-w-md mx-auto mb-6">Create your first personalized AI lesson to start your learning journey.</p>
          <button
            onClick={() => navigate("/upload")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-pencil-500 hover:bg-pencil-600 text-warm-950 font-bold rounded-xl transition-colors shadow-lg shadow-pencil-500/20"
          >
            Create Lesson
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map(lesson => (
            <div key={lesson._id} className="bg-warm-900 border border-warm-800/60 rounded-2xl p-6 hover:border-pencil-500/40 transition-colors flex flex-col group">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-cream-100 mb-2 line-clamp-2 group-hover:text-pencil-300 transition-colors">{lesson.title}</h3>
                {lesson.topic && <p className="text-warm-400 text-sm font-medium mb-5 line-clamp-1">{lesson.topic}</p>}
                
                <div className="flex items-center gap-4 text-sm text-warm-500 mb-8">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-pencil-400/80" /> {lesson.availableTimeMinutes}m</span>
                  <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-ink-500/80" /> {lesson.language}</span>
                  <span className="capitalize px-2.5 py-1 bg-warm-800 rounded-lg text-xs font-semibold text-warm-300">{lesson.learnerLevel}</span>
                </div>
              </div>
              
              <Link 
                to={`/lesson/${lesson._id}/play`}
                className="flex items-center justify-center gap-2 w-full py-3 bg-warm-800/60 hover:bg-pencil-500 hover:text-warm-950 text-cream-200 font-bold rounded-xl transition-all mt-auto border border-warm-700/30 hover:border-pencil-500 shadow-md shadow-transparent hover:shadow-pencil-500/20"
              >
                <PlayCircle className="w-5 h-5" /> Continue Lesson
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Lesson;
