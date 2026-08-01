from dotenv import load_dotenv
load_dotenv()  # This loads the variables from your local .env file

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import FRONTEND_URL
from app.routers import admin, forum, student

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app = FastAPI(
    title="Mathisis API",
    description="AI Tutor backend for engineering students — RAG-powered Q&A and forum.",
    version="1.0.0",
)

# CORS — allow the frontend origin (Vercel / localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(admin.router)
app.include_router(student.router)
app.include_router(forum.router)


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "Mathisis API"}
