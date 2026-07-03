import psycopg2
import threading
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os

load_dotenv()

_db_pool = None
_conn_keys = {}
_keys_lock = threading.Lock()


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
    key = threading.get_ident()
    p = _get_pool()
    conn = p.getconn(key)
    with _keys_lock:
        _conn_keys[id(conn)] = key
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        with _keys_lock:
            stored_key = _conn_keys.pop(id(conn), key)
        p.putconn(conn, stored_key)


def close_db_pool():
    global _db_pool
    if _db_pool is not None:
        _db_pool.closeall()
        _db_pool = None
