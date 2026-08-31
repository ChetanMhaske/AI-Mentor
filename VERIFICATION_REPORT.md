# AI Teacher - End-to-End Verification Report

This report outlines the actual state of the AI Teacher project. The audit was conducted by attempting to trace data flows through the system and inspecting the codebase for actual implementations versus stubs.

**Critical Environment Note:** Real execution of the AI Service and MongoDB is currently impossible on this environment because Python is not installed (`py` / `python` missing) and MongoDB is offline (Connection Refused). Consequently, the Node.js backend automatically falls back to hardcoded mock data for all frontend requests, meaning **no real data flows end-to-end**.

## 1. Feature Status Table

| Feature | Status | Evidence (What was actually tested/inspected) |
|---|---|---|
| **Document Ingestion + RAG** | STUB | `ai-service/app/services/rag_service.py` is entirely stubbed (`"STUB IMPLEMENTATION: Returns an empty list until vector DB integration"`). No actual chunking or vector DB storage occurs. |
| **Lesson Planning** | BROKEN | While prompt engineering exists in `ai-service`, the AI service cannot be started. Furthermore, `server/src/controllers/lesson.controller.js` explicitly returns hardcoded mock lessons (e.g., "Understanding Photosynthesis") when MongoDB is disconnected. |
| **Multilingual** | BROKEN | The language-switch endpoint exists but relies on the AI service which is offline. The UI sends the language preference, but no actual translation takes place. |
| **Video/Avatar Gen** | STUB | `ai-service/app/services/video_service.py` explicitly states `"For hackathon MVP, mocks actual generation if keys are missing"` and returns static placeholder URLs (`https://mock-storage...`). No D-ID or ElevenLabs APIs are actually called. |
| **Subject-Aware Visuals** | MISSING | A full scan of the codebase reveals **zero** sandbox execution logic (no Judge0 or subprocess calls) and no Manim integration. `VisualRenderer.jsx` only renders static markdown/Mermaid and placeholder images. |
| **Interactive Q&A** | STUB | `lesson.controller.js` falls back to a mocked `isCorrect` check (`studentAnswer === "mock_correct"`) and a hardcoded misconception response when offline, bypassing the AI service entirely. |
| **Assessment & Profile** | STUB | `POST /lessons/{id}/assessment/submit` in the Node controller returns a hardcoded `mockReport` object containing fake scores and weak concepts because the database is offline. MongoDB is never actually updated. |
| **Frontend Wiring** | BROKEN | The frontend pages (Dashboard, Upload, Lesson Player) are making real `fetch` calls, but they are receiving the mock JSON data emitted by the offline Node server instead of live LLM data. |

---

## 2. Prioritized Fix List (Hackathon Rubric)

To score well on the rubric, the following must be addressed in this order:

1. **Human-Like Teaching/Adaptation (20%) - FIX IMMEDIATELY**
   - Wire up the AI Service to actually generate unique lesson plans based on `learner_level` and `available_time_minutes`. Stop the Node server from returning mock data.
   - Implement the actual LLM call for mid-lesson Q&A misconception detection instead of using the string `"mock_correct"`.
2. **AI/ML+RAG (15% + 15%) - FIX IMMEDIATELY**
   - Implement `rag_service.py`. Currently, no document text is extracted, chunked, or embedded. The system has zero context of uploaded materials.
3. **Video Generation (15%) - HIGH PRIORITY**
   - Replace the static `mock_video_url` in `video_service.py` with an actual API call to a video avatar generator (like HeyGen or D-ID).
4. **Multilingual (10%) - HIGH PRIORITY**
   - Ensure the LLM prompt strictly enforces the `language` parameter and test that non-English languages generate properly.
5. **Subject-Aware Visuals (Everything Else) - MEDIUM PRIORITY**
   - The code execution sandbox for programming visuals is missing. Needs integration with Judge0 API or a secure Python subprocess.

---

## 3. Codebase Stub Scan (Locations of Fake Data)

Grep scans across the codebase revealed the following critical areas where logic is faked:

- **RAG Stub:**
  - `ai-service/app/services/rag_service.py:4` - `"STUB IMPLEMENTATION: Returns an empty list until vector DB integration"`
- **Video/Avatar Stub:**
  - `ai-service/app/services/video_service.py:3` - `"For hackathon MVP, mocks actual generation if keys are missing."`
  - `ai-service/app/services/video_service.py:46/51` - Hardcoded `https://mock-storage.example.com...` URLs.
- **Node Server Controller Mocks:**
  - `server/src/controllers/lesson.controller.js:28` - `console.warn("MongoDB not connected. Returning mock lessons for UI demo.");`
  - `server/src/controllers/lesson.controller.js:137` - `const isCorrect = studentAnswer === "mock_correct" || studentAnswer === "1";`
  - `server/src/controllers/lesson.controller.js:238` - `const mockReport = { score: 2, max_score: 3, percentage: 66.7, ... }`
- **Frontend Fallbacks:**
  - `client/src/pages/Progress.jsx:22` - `// Mock data fallback` for the Dashboard charts.
  - `client/src/pages/Dashboard.jsx:32` - `// Mock data for when backend isn't connected`

**Conclusion:** The project currently exists as a UI mockup with an offline backend. To achieve functionality, Python and MongoDB must be configured in the host environment, and the empty RAG and Avatar services must be connected to real APIs.
