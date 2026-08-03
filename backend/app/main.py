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
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://mathisis-swagat-kodes.vercel.app",
        "https://mathisis-swagat-kodes.vercel.app/",
        FRONTEND_URL,
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:\d+)?",
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
