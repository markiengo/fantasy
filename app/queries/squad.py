from app.core.validation import budget_cap

def get_squad(conn, user_id, matchday):
    cursor = conn.cursor()
    cursor.execute('''
        SELECT
            s.matchday, s.budget_used, (%s - s.budget_used) as budget_remaining,
            sp.squad_id, sp.player_id, sp.is_captain,
            p.name as player_name, p.position, p.team_id, p.base_price,
            t.name as team_name
        FROM squad s
        JOIN squadplayer sp
            ON s.squad_id = sp.squad_id
        JOIN player p
            ON sp.player_id = p.player_id
        JOIN team t
            ON p.team_id = t.team_id
        WHERE s.user_id = %s AND s.matchday = %s
        ''', (float(budget_cap), user_id, matchday))
    results = cursor.fetchall()
    cursor.close()
    return results

# other validation rules will be in /core
# player_ids: list of 11 player_ids from request body, assembled in router
# budget_used: calculated in router before calling this function
# user_id: derived from the verified bearer token in the router (Phase 2)

def get_effective_squad(conn, user_id, matchday):
    """Return the squad for matchday, or the most recent prior squad if none exists yet."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT matchday FROM squad WHERE user_id = %s AND matchday <= %s ORDER BY matchday DESC LIMIT 1",
        (user_id, matchday)
    )
    row = cursor.fetchone()
    cursor.close()
    if not row:
        return []
    return get_squad(conn, user_id, row["matchday"])

def create_squad(conn, user_id, matchday, budget_used, player_ids, captain_player_id=None, time_left=0):
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO squad (user_id, matchday, budget_used, time_left)
            VALUES (%s, %s, %s, %s)
            RETURNING squad_id
            ''', (user_id, matchday, budget_used, time_left))
        squad_id = cursor.fetchone()["squad_id"]
        
        for player_id in player_ids:
            is_cap = player_id == captain_player_id
            cursor.execute('''
                INSERT INTO squadplayer (squad_id, player_id, is_captain)
                VALUES (%s, %s, %s)
                ''', (squad_id, player_id, is_cap))
        
        conn.commit()
        return squad_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
