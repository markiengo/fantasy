import psycopg2
import itertools
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os

load_dotenv()

_db_pool = None
_key_counter = itertools.count(1)


def _get_pool():
    global _db_pool
    if _db_pool is None:
        _db_pool = pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=int(os.getenv("DB_POOL_MAX", "20")),
            dsn=os.getenv("DATABASE_URL"),
            cursor_factory=RealDictCursor,
        )
    return _db_pool


def get_db():
    key = next(_key_counter)
    p = _get_pool()
    conn = p.getconn(key)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        p.putconn(conn, key)


def close_db_pool():
    global _db_pool
    if _db_pool is not None:
        _db_pool.closeall()
        _db_pool = None
