from app.core.validation import budget_cap

def get_squad(conn, matchday):
    cursor = conn.cursor()
    cursor.execute('''
        SELECT
            s.matchday, s.budget_used, (%s - s.budget_used) as budget_remaining,
            sp.squad_id, sp.player_id,
            p.name as player_name, p.position, p.team_id, p.base_price,
            t.name as team_name
        FROM squad s
        JOIN squadplayer sp
            ON s.squad_id = sp.squad_id
        JOIN player p
            ON sp.player_id = p.player_id
        JOIN team t
            ON p.team_id = t.team_id
        WHERE s.matchday = %s
        ''', (float(budget_cap), matchday))
    results = cursor.fetchall() 
    cursor.close()
    return results

# other validation rules will be in /core 
# player_ids: list of 11 player_ids from request body, assembled in router
# budget_used: calculated in router before calling this function
# user_id: hardcoded in router (single user, no auth in v1)

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
    return get_squad(conn, row["matchday"])

def create_squad(conn, user_id, matchday, budget_used, player_ids):
    cursor = conn.cursor()
    
    # INSERT into squad, get back the squad_id
    cursor.execute('''
        INSERT INTO squad (user_id, matchday, budget_used)
        VALUES (%s, %s, %s)
        RETURNING squad_id
        ''', (user_id, matchday, budget_used))
    squad_id = cursor.fetchone()["squad_id"]
    
    # INSERT 11 rows into squadplayer. #player_ids will be in routers 
    for player_id in player_ids:
        cursor.execute('''
            INSERT INTO squadplayer (squad_id, player_id)
            VALUES (%s, %s)
            ''', (squad_id, player_id))
    
    conn.commit()
    cursor.close()
    return squad_id
