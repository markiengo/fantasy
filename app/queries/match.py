def get_matches(conn, matchday = None, stage = None):
    cursor = conn.cursor()
    query = '''
        SELECT m.match_id, m.team1_id, t1.name AS team1_name,
               m.team2_id, t2.name AS team2_name, m.matchday, m.stage, m.date,
               m.team1_score, m.team2_score, m.kickoff, m.bracket_order
        FROM match m
        JOIN team t1 ON m.team1_id = t1.team_id
        JOIN team t2 ON m.team2_id = t2.team_id
    '''

    filters = []
    values = []

    if matchday is not None:
        filters.append("m.matchday = %s")
        values.append(matchday)
    if stage is not None:
        filters.append("m.stage = %s")
        values.append(stage)
    if filters:
        query += " WHERE " + " AND ".join(filters)
    query += " ORDER BY m.matchday ASC"

    cursor.execute(query, values)
    results = cursor.fetchall()
    cursor.close()
    return results


def get_match(conn, match_id):
    cursor = conn.cursor()
    cursor.execute('''
        SELECT m.match_id, m.team1_id, t1.name AS team1_name,
               m.team2_id, t2.name AS team2_name, m.matchday, m.stage, m.date,
               m.team1_score, m.team2_score, m.kickoff, m.bracket_order
        FROM match m
        JOIN team t1 ON m.team1_id = t1.team_id
        JOIN team t2 ON m.team2_id = t2.team_id
        WHERE m.match_id = %s
        ''', (match_id,))
    results = cursor.fetchone()
    cursor.close()
    return results

def get_matchday_start(conn, matchday):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT MIN(kickoff) AS first_kickoff FROM match WHERE matchday = %s",
        (matchday,)
    )
    row = cursor.fetchone()
    cursor.close()
    return row["first_kickoff"] if row else None

def update_match_score(conn, match_id, team1_score, team2_score):
    cursor = conn.cursor()
    try:
        cursor.execute(
            '''
            UPDATE match
            SET team1_score = %s, team2_score = %s
            WHERE match_id = %s
            ''',
            (team1_score, team2_score, match_id)
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()

def get_match_dates_without_stats(conn):
    cursor = conn.cursor()
    cursor.execute('''
        SELECT DISTINCT m.date
        FROM match m
        WHERE NOT EXISTS (
            SELECT 1 FROM playerstat ps WHERE ps.match_id = m.match_id
        )
        AND m.date <= CURRENT_DATE
        ORDER BY m.date ASC
    ''')
    rows = cursor.fetchall()
    cursor.close()
    return [row["date"] for row in rows]


def get_match_stats(conn, match_id):
    cursor = conn.cursor()
    cursor.execute('''
        SELECT ps.stat_id, ps.player_id, p.name AS player_name,
               ps.goals, ps.assists, ps.minutes_played,
               ps.yellow_cards, ps.red_cards, ps.clean_sheet, ps.score
        FROM playerstat ps
        JOIN player p ON ps.player_id = p.player_id
        WHERE ps.match_id = %s
        ''', (match_id,))
    results = cursor.fetchall()
    cursor.close()
    return results
