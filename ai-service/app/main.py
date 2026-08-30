from fastapi import FastAPI
from app.routers import health, lessons

app = FastAPI(title="AI Mentor - AI Service", version="0.1.0")

app.include_router(health.router)
app.include_router(lessons.router)
