import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Lesson from "./pages/Lesson";
import LessonPlayer from "./pages/LessonPlayer";
import Assessment from "./pages/Assessment";
import Progress from "./pages/Progress";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/lesson" element={<Lesson />} />
        <Route path="/lesson/:id/play" element={<LessonPlayer />} />
        <Route path="/lesson/:id/assessment" element={<Assessment />} />
        <Route path="/progress" element={<Progress />} />
      </Route>
    </Routes>
  );
}

export default App;
