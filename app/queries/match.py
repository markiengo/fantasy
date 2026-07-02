def get_matches(conn, matchday = None, stage = None):
    cursor = conn.cursor()
    query = '''
        SELECT m.match_id, m.team1_id, t1.name AS team1_name,
               m.team2_id, t2.name AS team2_name, m.matchday, m.stage, m.date,
               m.team1_score, m.team2_score, m.kickoff, m.bracket_order,
               m.team1_penalty_score, m.team2_penalty_score
        FROM match m
        LEFT JOIN team t1 ON m.team1_id = t1.team_id
        LEFT JOIN team t2 ON m.team2_id = t2.team_id
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
               m.team1_score, m.team2_score, m.kickoff, m.bracket_order,
               m.team1_penalty_score, m.team2_penalty_score
        FROM match m
        LEFT JOIN team t1 ON m.team1_id = t1.team_id
        LEFT JOIN team t2 ON m.team2_id = t2.team_id
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

def update_match_score(conn, match_id, team1_score, team2_score, team1_penalty=None, team2_penalty=None):
    cursor = conn.cursor()
    try:
        cursor.execute(
            '''
            UPDATE match
            SET team1_score = %s, team2_score = %s,
                team1_penalty_score = %s, team2_penalty_score = %s
            WHERE match_id = %s
            ''',
            (team1_score, team2_score, team1_penalty, team2_penalty, match_id)
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


# knoutout rounds in order, final has no next round
STAGE_SEQUENCE = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"]


# returns winner team_id from score, falls back to penalties
def match_winner_id(match):
    if match["team1_score"] is None or match["team2_score"] is None:
        return None
    #regular time winner
    if match["team1_score"] > match["team2_score"]:
        return match["team1_id"]
    if match["team2_score"] > match["team1_score"]:
        return match["team2_id"]

    # draw → check penalties
    if match["team1_penalty_score"] is not None and match["team2_penalty_score"] is not None:
        if match["team1_penalty_score"] > match["team2_penalty_score"]:
            return match["team1_id"]
        if match["team2_penalty_score"] > match["team1_penalty_score"]:
            return match["team2_id"]
    return None


# writes match winner into the next round's slot
def advance_bracket_winner(conn, match_id):
    match = get_match(conn, match_id)
    if not match:
        return False
    # final has no next round
    if match["stage"] not in STAGE_SEQUENCE or match["stage"] == "final":
        return False
    winner_id = match_winner_id(match)
    if not winner_id:
        return False

    # find next stage in the sequence
    current_idx = STAGE_SEQUENCE.index(match["stage"])
    next_stage = STAGE_SEQUENCE[current_idx + 1]

    # r32 uses 1-indexed, others use 0-indexed for pairing math
    if match["stage"] == "round_of_32":
        k0 = match["bracket_order"]
    else:
        k0 = match["bracket_order"] - 1

    # two matches feed into one: matches 1 & 2 of the previous round → next round's slot 1, 3 & 4 of previous round → slot 2
    next_order = (k0 // 2) + 1
    #even k0 → team 1 slot, odd k0 → team 2 slot
    slot = k0 % 2

    cursor = conn.cursor()
    try:
        if slot == 0:
            #winner goes into team1 of next match
            cursor.execute(
                "UPDATE match SET team1_id = %s WHERE stage = %s AND bracket_order = %s",
                (winner_id, next_stage, next_order),
            )
        else:
            #winner goes into team2 of next match
            cursor.execute(
                "UPDATE match SET team2_id = %s WHERE stage = %s AND bracket_order = %s",
                (winner_id, next_stage, next_order),
            )
        conn.commit()
        return cursor.rowcount > 0
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()

#cascades all knockout winners into next rounds in order
def advance_all_bracket_winners(conn):
    cursor = conn.cursor()
    #all knockout matches except final, earliest round first
    cursor.execute(
        "SELECT match_id FROM match WHERE stage IN %s ORDER BY matchday ASC, bracket_order ASC",
        (tuple(STAGE_SEQUENCE[:-1]),),
    )
    match_ids = [row["match_id"] for row in cursor.fetchall()]
    cursor.close()

    advanced = 0
    for mid in match_ids:
        if advance_bracket_winner(conn, mid):
            advanced = advanced + 1
    return advanced
