from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

# Service-role client: bypasses RLS — use ONLY on trusted backend operations
_supabase_client: Client | None = None


def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase_client
