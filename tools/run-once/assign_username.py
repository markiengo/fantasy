import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"), cursor_factory=RealDictCursor)
cur = conn.cursor()

cur.execute(
    """
    UPDATE public.users
    SET username = %s, display_name = %s
    WHERE auth_user_id = (
        SELECT id FROM auth.users WHERE email = %s
    )
    RETURNING user_id, username, display_name, auth_user_id
    """,
    ("tân", "tân", "nhattan2309@gmail.com"),
)
row = cur.fetchone()
conn.commit()

if row:
    print(f"Updated: {dict(row)}")
else:
    print("No user found with that email")

cur.close()
conn.close()
