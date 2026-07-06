"""
Creates all required Supabase tables.
Run once before the first sync:

    python db/setup.py
"""

from db.database import get_supabase, SCHEMA_SQL


def setup():
    sb = get_supabase()
    statements = [s.strip() for s in SCHEMA_SQL.split(";") if s.strip()]

    print(f"Running {len(statements)} schema statements...")
    for stmt in statements:
        result = sb.rpc("pg_temp_exec", {"sql": stmt}).execute()

    print("Done. Tables are ready.")


# ── Fallback: print the SQL if the rpc approach isn't available ────────────────
def print_sql():
    print("\nCopy and run this in your Supabase SQL editor:\n")
    print(SCHEMA_SQL)


if __name__ == "__main__":
    try:
        setup()
    except Exception as e:
        print(f"Auto-setup failed ({e})")
        print("Run the SQL manually instead:")
        print_sql()
