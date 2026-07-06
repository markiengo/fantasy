from app.core.scoring import calculate_score, captain_score, captain_score_sql

def get_squad_score(conn, user_id, matchday=None):
    """Get the user's squad score.
    If matchday is specified, returns per-player breakdown for that matchday
    (captain score is already x2).
    If matchday is not specified, returns cumulative squad score grouped by matchday.
    """
    cursor = conn.cursor()

    if matchday is not None:
        cursor.execute(f'''
            SELECT ps.player_id, p.name, p.position,
                   {captain_score_sql()} AS player_score,
                   sp.is_captain
            FROM playerstat ps
            JOIN player p
                ON ps.player_id = p.player_id
            JOIN squadplayer sp
                ON p.player_id = sp.player_id
            JOIN squad s
                ON sp.squad_id = s.squad_id
            JOIN match m
                ON ps.match_id = m.match_id AND m.matchday = s.matchday
            WHERE s.user_id = %s AND s.matchday = %s
        ''', (user_id, matchday))
    else:
        cursor.execute(f'''
            SELECT s.matchday, SUM(
                {captain_score_sql()}
            ) as squad_score
            FROM playerstat ps
            JOIN squadplayer sp
                ON ps.player_id = sp.player_id
            JOIN squad s
                ON sp.squad_id = s.squad_id
            JOIN match m
                ON ps.match_id = m.match_id AND m.matchday = s.matchday
            WHERE s.user_id = %s
            GROUP BY s.matchday
            ORDER BY s.matchday ASC
        ''', (user_id,))
    result = cursor.fetchall()
    cursor.close()
    return result


# ── Score composition: where points come from ────────────────────────────────

def get_squad_score_composition(conn, user_id, matchday):
    """Break down the squad's score for a matchday by stat type.
    Returns a dict with points from each scoring category."""
    
    cursor = conn.cursor()
    cursor.execute('''
        SELECT sp.is_captain,
               p.position,
               ps.goals,
               ps.assists,
               ps.minutes_played,
               ps.clean_sheet,
               ps.yellow_cards,
               ps.red_cards,
               ps.saves,
               ps.own_goals,
               ps.shots_on_target,
               ps.fouls_committed,
               ps.offsides,
               ps.goals_conceded
        FROM squad s
        JOIN squadplayer sp
            ON s.squad_id = sp.squad_id
        JOIN player p
            ON sp.player_id = p.player_id
        JOIN playerstat ps
            ON sp.player_id = ps.player_id
        JOIN match m
            ON ps.match_id = m.match_id AND m.matchday = s.matchday
        WHERE s.user_id = %s AND s.matchday = %s
    ''', (user_id, matchday))
    rows = cursor.fetchall()
    cursor.close()

    goals_pts = 0
    assist_pts = 0
    cs_pts = 0
    minute_pts = 0
    card_pts = 0
    saves_pts = 0
    sot_pts = 0
    own_goal_pts = 0
    foul_pts = 0
    offside_pts = 0
    gc_pts = 0

    for row in rows:
        pos = row["position"]
        is_captain = row["is_captain"]

        if pos in ("FWD", "MID"):
            raw_goals = (row["goals"] or 0) * 5
        elif pos == "DEF":
            raw_goals = (row["goals"] or 0) * 7
        else:
            raw_goals = (row["goals"] or 0) * 6
        goals_pts += captain_score(raw_goals, is_captain)

        raw_assists = (row["assists"] or 0) * 3
        assist_pts += captain_score(raw_assists, is_captain)

        if pos in ("DEF", "GK"):
            raw_cs = (row["clean_sheet"] or 0) * 4
            cs_pts += captain_score(raw_cs, is_captain)

        if pos == "GK":
            raw_saves = (row["saves"] or 0) * 1
            saves_pts += captain_score(raw_saves, is_captain)

        if pos in ("FWD", "MID"):
            raw_sot = (row["shots_on_target"] or 0) * 1
            sot_pts += captain_score(raw_sot, is_captain)

        mins = row["minutes_played"] or 0
        if mins >= 60:
            minute_pts += captain_score(2, is_captain)
        elif mins > 0:
            minute_pts += captain_score(1, is_captain)

        raw_cards = -((row["yellow_cards"] or 0) * 1 + (row["red_cards"] or 0) * 3)
        card_pts += captain_score(raw_cards, is_captain)

        raw_og = -((row["own_goals"] or 0) * 3)
        own_goal_pts += captain_score(raw_og, is_captain)

        raw_fouls = -((row["fouls_committed"] or 0) * 0.5)
        foul_pts += captain_score(raw_fouls, is_captain)

        raw_offsides = -((row["offsides"] or 0) * 0.25)
        offside_pts += captain_score(raw_offsides, is_captain)

        if pos in ("DEF", "GK"):
            raw_gc = -((row["goals_conceded"] or 0) * 0.5)
            gc_pts += captain_score(raw_gc, is_captain)

    total = (goals_pts + assist_pts + cs_pts + minute_pts + card_pts
             + saves_pts + sot_pts + own_goal_pts + foul_pts + offside_pts + gc_pts)

    return {
        "matchday": matchday,
        "goals_pts": goals_pts,
        "assist_pts": assist_pts,
        "cs_pts": cs_pts,
        "minute_pts": minute_pts,
        "card_pts": card_pts,
        "saves_pts": saves_pts,
        "sot_pts": sot_pts,
        "own_goal_pts": own_goal_pts,
        "foul_pts": foul_pts,
        "offside_pts": offside_pts,
        "gc_pts": gc_pts,
        "total": total,
    }


# ── Rank history: user's leaderboard position per matchday ───────────────────

def get_rank_history(conn, user_id):
    """Get the user's cumulative rank at each matchday where they have a squad.

    Returns a list of dicts: [{matchday, rank, squad_score, total_managers}]
    Rank is computed against all active users who also have squads up to
    and including that matchday.
    """
    cursor = conn.cursor()
    cursor.execute(f'''
        WITH user_scores AS (
            SELECT
                s.user_id,
                s.matchday AS md,
                SUM(
                    {captain_score_sql()}
                ) AS md_score
            FROM squad s
            JOIN squadplayer sp
                ON s.squad_id = sp.squad_id
            JOIN playerstat ps
                ON sp.player_id = ps.player_id
            JOIN match m
                ON ps.match_id = m.match_id AND m.matchday = s.matchday
            JOIN users u
                ON s.user_id = u.user_id AND u.is_active = true
            GROUP BY s.user_id, s.matchday
        ),
        cumulative AS (
            SELECT
                u1.user_id,
                u1.md,
                SUM(u2.md_score) AS cum_score
            FROM user_scores u1
            JOIN user_scores u2
                ON u2.user_id = u1.user_id AND u2.md <= u1.md
            GROUP BY u1.user_id, u1.md
        ),
        ranked AS (
            SELECT
                c.user_id,
                c.md,
                c.cum_score,
                RANK() OVER (
                    PARTITION BY c.md
                    ORDER BY c.cum_score DESC, c.user_id ASC
                ) AS rank,
                COUNT(*) OVER (PARTITION BY c.md) AS total_managers
            FROM cumulative c
        )
        SELECT md AS matchday, rank, cum_score AS squad_score, total_managers
        FROM ranked
        WHERE user_id = %s
        ORDER BY md ASC
    ''', (user_id,))
    rows = cursor.fetchall()
    cursor.close()

    result = []
    for row in rows:
        result.append({
            "matchday": row["matchday"],
            "rank": row["rank"],
            "squad_score": row["squad_score"],
            "total_managers": row["total_managers"],
        })
    return result
