import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import health, lessons, materials

app = FastAPI(title="AI Mentor - AI Service", version="0.1.0")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(health.router)
app.include_router(lessons.router)
app.include_router(materials.router)
