import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Validate required vars at startup
_required = {
    "SUPABASE_URL": SUPABASE_URL,
    "SUPABASE_SERVICE_KEY": SUPABASE_SERVICE_KEY,
}
_missing = [k for k, v in _required.items() if not v]
if _missing:
    raise EnvironmentError(
        f"Missing required environment variables: {', '.join(_missing)}"
    )

