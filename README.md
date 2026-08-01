# Mathisis — AI Tutor for Engineering Students

> RAG-powered AI tutoring app with Gemini, Supabase, FastAPI, and React.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Backend | FastAPI + Python 3.11 |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth |
| AI | Google Gemini (`text-embedding-004` + `gemini-1.5-flash`) |
| Deploy | Vercel (frontend) + Render (backend) |

## Project Structure
```
Mathisis/
├── backend/          # FastAPI backend
├── frontend/         # React Vite frontend
├── supabase/
│   └── migrations/   # SQL migrations (run in order)
└── .env.example      # Required environment variables
```

## Setup Instructions

### 1. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run migrations **in order**:
   - `001_extensions_and_profiles.sql`
   - `002_subjects.sql`
   - `003_textbook_embeddings.sql`
   - `004_student_queries.sql`
   - `005_rpc_and_rls.sql`
3. Go to **Project Settings → API** and copy:
   - Project URL → `SUPABASE_URL`
   - `anon/public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY`
4. To create an admin user: sign up normally, then in Supabase SQL Editor run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = 'your-user-uuid';
   ```

### 2. Gemini API Key
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create an API key → `GEMINI_API_KEY`

### 3. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp ../.env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY

# Run development server
uvicorn app.main:app --reload
```
API docs available at: http://localhost:8000/docs

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp ../.env.example .env
# Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_BACKEND_URL=http://localhost:8000

# Run development server
npm run dev
```
App available at: http://localhost:5173

## Deployment

### Backend (Render)
1. Connect GitHub repo to [render.com](https://render.com)
2. New → **Web Service**
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `FRONTEND_URL`

### Frontend (Vercel)
1. Connect GitHub repo to [vercel.com](https://vercel.com)
2. Framework: **Vite**
3. Root directory: `frontend`
4. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL` (your Render URL)

## Architecture

```
Student Browser
│
├── GET /student/subjects     → Filter by year/semester
├── POST /student/ask         → RAG: embed → vector search → Gemini → answer + citations
└── CRUD /forum/queries       → Submit/view questions

Admin Browser
└── POST /admin/upload-pdf    → Parse PDF → chunk → embed → Supabase insert

FastAPI Backend
├── auth.py                   → JWT verification via Supabase
├── routers/admin.py          → PDF processing pipeline
├── routers/student.py        → RAG query endpoint
└── routers/forum.py          → Forum CRUD with role enforcement

Supabase
├── auth.users                → Authentication
├── profiles                  → Roles (admin/student)
├── subjects                  → Course catalogue
├── textbook_embeddings       → vector(768) chunks + pgvector
└── student_queries           → Forum posts
```
