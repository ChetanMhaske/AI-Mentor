import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Lesson from "./pages/Lesson";
import LessonPlayer from "./pages/LessonPlayer";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/lesson" element={<Lesson />} />
        <Route path="/lesson/:id/play" element={<LessonPlayer />} />
      </Route>
    </Routes>
  );
}

export default App;
