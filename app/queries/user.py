def get_user_by_auth_id(conn, auth_user_id):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT user_id, username, auth_user_id, display_name, role, is_active, created_at
            FROM users
            WHERE auth_user_id = %s
            """,
            (auth_user_id,)
        )
        row = cursor.fetchone()
        return row
    finally:
        cursor.close()


def create_user_from_auth(conn, auth_user_id, username, display_name):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO users (auth_user_id, username, display_name, role, is_active)
            VALUES (%s, %s, %s, 'user', true)
            RETURNING user_id, username, auth_user_id, display_name, role, is_active, created_at
            """,
            (auth_user_id, username, display_name)
        )
        row = cursor.fetchone()
        conn.commit()
        return row
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
