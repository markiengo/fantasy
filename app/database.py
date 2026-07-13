import itertools
import os

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

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


def _discard_connection(db_pool, conn, key):
    """Remove a broken connection so the pool never hands it out again."""
    db_pool.putconn(conn, key, close=True)


def _acquire_healthy_connection(db_pool, key):
    """Return a live pooled connection, replacing a stale one once if needed."""
    last_error = None
    for _ in range(2):
        conn = db_pool.getconn(key)
        try:
            if conn.closed:
                raise psycopg2.InterfaceError("Pooled connection is already closed")

            cursor = conn.cursor()
            try:
                cursor.execute("SELECT 1")
            finally:
                cursor.close()
            conn.rollback()
            return conn
        except (psycopg2.Error, OSError) as error:
            last_error = error
            _discard_connection(db_pool, conn, key)

    raise last_error


def get_db():
    key = next(_key_counter)
    db_pool = _get_pool()
    conn = _acquire_healthy_connection(db_pool, key)
    discard = False
    try:
        yield conn
        conn.commit()
    except Exception:
        if conn.closed:
            discard = True
        else:
            try:
                conn.rollback()
            except (psycopg2.Error, OSError):
                discard = True
        raise
    finally:
        db_pool.putconn(conn, key, close=discard or bool(conn.closed))


def close_db_pool():
    global _db_pool
    if _db_pool is not None:
        _db_pool.closeall()
        _db_pool = None
