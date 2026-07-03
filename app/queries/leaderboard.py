from app.core.scoring import captain_score_sql

_joins = """
    FROM users u
    JOIN squad s
        ON s.user_id = u.user_id
    JOIN squadplayer sp
        ON s.squad_id = sp.squad_id
    JOIN playerstat ps
        ON sp.player_id = ps.player_id
    JOIN match m
        ON ps.match_id = m.match_id AND m.matchday = s.matchday
"""

_group_order = """
    GROUP BY u.user_id, u.username, u.display_name
    ORDER BY squad_score DESC, u.user_id ASC
"""

_matchday_group_order = """
    GROUP BY u.user_id, u.username, u.display_name, prev.prev_squad_score
    ORDER BY squad_score DESC, u.user_id ASC
"""


def _cumulative_sql():
    return f"""
        SELECT u.user_id, u.username, u.display_name, SUM(
            {captain_score_sql()}
        ) as squad_score
        {_joins}
        WHERE u.is_active = true
        {_group_order}
    """


def _matchday_sql():
    return f"""
        WITH prev AS (
            SELECT s2.user_id, SUM(
                {captain_score_sql("sp2", "ps2")}
            ) as prev_squad_score
            FROM squad s2
            JOIN squadplayer sp2
                ON s2.squad_id = sp2.squad_id
            JOIN playerstat ps2
                ON sp2.player_id = ps2.player_id
            JOIN match m2
                ON ps2.match_id = m2.match_id AND m2.matchday = s2.matchday
            WHERE s2.matchday <= %s
            GROUP BY s2.user_id
        )
        SELECT u.user_id, u.username, u.display_name, SUM(
            {captain_score_sql()}
        ) as squad_score,
        prev.prev_squad_score
        {_joins}
        LEFT JOIN prev ON prev.user_id = u.user_id
        WHERE u.is_active = true AND s.matchday <= %s
        {_matchday_group_order}
    """


def _fetch_rows(conn, matchday):
    cursor = conn.cursor()
    if matchday is not None:
        prev_md = matchday - 1
        cursor.execute(_matchday_sql(), (prev_md, matchday))
    else:
        cursor.execute(_cumulative_sql())
    rows = cursor.fetchall()
    cursor.close()
    return rows


def _format_entries(rows):
    entries = []
    rank = 0
    for row in rows:
        rank = rank + 1
        score = row["squad_score"]
        prev_score = row.get("prev_squad_score")
        delta = None
        if prev_score is not None:
            delta = score - prev_score
        entries.append({
            "rank": rank,
            "user_id": row["user_id"],
            "username": row["username"],
            "display_name": row["display_name"],
            "squad_score": score,
            "delta": delta,
        })
    return entries


def get_leaderboard(conn, matchday=None):
    rows = _fetch_rows(conn, matchday)
    return _format_entries(rows)


def get_leaderboard_matchdays(conn):
    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT DISTINCT s.matchday
        {_joins}
        WHERE u.is_active = true
        ORDER BY s.matchday ASC
    """)
    rows = cursor.fetchall()
    cursor.close()

    matchdays = []
    for row in rows:
        if "matchday" in row:
            matchdays.append(row["matchday"])
    return matchdays


def _latest_matchday(conn):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT MAX(s.matchday) AS md
        FROM squad s
        JOIN users u ON s.user_id = u.user_id
        WHERE u.is_active = true
    """)
    row = cursor.fetchone()
    cursor.close()
    if row and row["md"] is not None:
        return row["md"]
    return None


def get_popular_players(conn, matchday, limit=10):
    if matchday is None:
        matchday = _latest_matchday(conn)
    if matchday is None:
        return []

    cursor = conn.cursor()
    cursor.execute("""
        WITH total AS (
            SELECT COUNT(DISTINCT s.user_id) AS n
            FROM squad s
            JOIN users u ON s.user_id = u.user_id
            WHERE u.is_active = true AND s.matchday = %s
        )
        SELECT p.player_id, p.name, p.position, p.team_id, t.name AS team_name,
               COUNT(*) AS pick_count,
               ROUND(COUNT(*) * 100.0 / total.n, 1) AS pick_rate,
               COUNT(CASE WHEN sp.is_captain THEN 1 END) AS captain_count
        FROM squad s
        JOIN users u ON s.user_id = u.user_id
        JOIN squadplayer sp ON s.squad_id = sp.squad_id
        JOIN player p ON sp.player_id = p.player_id
        JOIN team t ON p.team_id = t.team_id
        CROSS JOIN total
        WHERE u.is_active = true AND s.matchday = %s
        GROUP BY p.player_id, p.name, p.position, p.team_id, t.name, total.n
        ORDER BY pick_count DESC, captain_count DESC, p.player_id ASC
        LIMIT %s
    """, (matchday, matchday, limit))
    rows = cursor.fetchall()
    cursor.close()

    players = []
    for row in rows:
        players.append({
            "player_id": row["player_id"],
            "name": row["name"],
            "position": row["position"],
            "team_id": row["team_id"],
            "team_name": row["team_name"],
            "pick_count": row["pick_count"],
            "pick_rate": float(row["pick_rate"]) if row["pick_rate"] is not None else 0.0,
            "captain_count": row["captain_count"],
        })
    return players