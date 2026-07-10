def get_user_by_auth_id(conn, auth_user_id):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT user_id, username, auth_user_id, display_name, role, is_active, transfer_override, created_at
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


def get_user_by_username(conn, username):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT user_id, username, auth_user_id, display_name, role, is_active, created_at
            FROM users
            WHERE username = %s
            """,
            (username,)
        )
        row = cursor.fetchone()
        return row
    finally:
        cursor.close()


def check_username_taken(conn, username):
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM users WHERE username = %s",
            (username,)
        )
        return cursor.fetchone() is not None
    finally:
        cursor.close()


def get_email_by_username(conn, username):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT au.email
            FROM auth.users au
            JOIN public.users pu ON pu.auth_user_id = au.id
            WHERE pu.username = %s
            """,
            (username,)
        )
        row = cursor.fetchone()
        return row["email"] if row else None
    finally:
        cursor.close()


def get_user_by_id(conn, user_id):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT user_id, username, auth_user_id, display_name, role, is_active, created_at
            FROM users
            WHERE user_id = %s
            """,
            (user_id,)
        )
        row = cursor.fetchone()
        return row
    finally:
        cursor.close()


def update_display_name(conn, user_id, display_name):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE users SET display_name = %s
            WHERE user_id = %s
            RETURNING user_id, username, auth_user_id, display_name, role, is_active, created_at
            """,
            (display_name, user_id)
        )
        row = cursor.fetchone()
        conn.commit()
        return row
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()


def get_user_account_info(conn, user_id):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT pu.user_id, pu.username, pu.display_name, pu.role, pu.is_active, pu.created_at,
                   au.email
            FROM public.users pu
            LEFT JOIN auth.users au ON au.id = pu.auth_user_id
            WHERE pu.user_id = %s
            """,
            (user_id,)
        )
        row = cursor.fetchone()
        return row
    finally:
        cursor.close()
