import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, PlayCircle, Loader2, Clock, Globe } from "lucide-react";

function Lesson() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const res = await fetch("/api/lessons", {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (!res.ok) throw new Error("Failed to load lessons");
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
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-white mb-3">Your Lessons</h2>
          <p className="text-lg text-gray-400">Review your generated AI-guided lessons.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400">
          {error}
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center p-12 bg-[#1e2029] rounded-2xl border border-gray-800">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No lessons yet</h3>
          <p className="text-gray-400">Go to the Dashboard or Upload page to generate your first lesson.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map(lesson => (
            <div key={lesson._id} className="bg-[#1e2029] border border-gray-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-colors flex flex-col">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{lesson.title}</h3>
                {lesson.topic && <p className="text-indigo-400 text-sm font-medium mb-4">{lesson.topic}</p>}
                
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {lesson.availableTimeMinutes}m</span>
                  <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> {lesson.language}</span>
                  <span className="capitalize px-2 py-0.5 bg-gray-800 rounded-md text-xs">{lesson.learnerLevel}</span>
                </div>
              </div>
              
              <Link 
                to={`/lesson/${lesson._id}/play`}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors mt-auto shadow-md shadow-indigo-900/20"
              >
                <PlayCircle className="w-5 h-5" /> Start Lesson
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Lesson;
