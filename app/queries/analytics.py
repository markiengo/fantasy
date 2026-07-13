from app.core.scoring import calculate_score, captain_score, captain_score_sql

STAT_FIELDS = [
    "goals", "assists", "minutes_played", "clean_sheet",
    "yellow_cards", "red_cards", "saves", "penalty_saves",
    "own_goals", "shots_on_target", "fouls_committed",
    "offsides", "goals_conceded",
]


def get_player_breakdown(conn, user_id, matchday=None):
    """Per-player raw stats + per-stat point breakdown for a matchday.
    If matchday is None, defaults to the user's latest squad matchday.
    Returns list of player dicts with raw stats, stat_points, and total_points.
    Captain x2 is applied per stat. Only non-zero stats are included in stat_points.
    """
    cursor = conn.cursor()

    if matchday is None:
        cursor.execute('''
            SELECT MAX(s.matchday) AS latest_md
            FROM squad s
            WHERE s.user_id = %s
        ''', (user_id,))
        row = cursor.fetchone()
        matchday = row["latest_md"] if row else None
        if matchday is None:
            cursor.close()
            return {"matchday": None, "players": []}

    cursor.execute('''
        SELECT sp.player_id, p.name, p.position, sp.is_captain,
               ps.goals, ps.assists, ps.minutes_played, ps.clean_sheet,
               ps.yellow_cards, ps.red_cards, ps.saves, ps.penalty_saves,
               ps.own_goals, ps.shots_on_target, ps.fouls_committed,
               ps.offsides, ps.goals_conceded
        FROM squad s
        JOIN squadplayer sp
            ON s.squad_id = sp.squad_id
        JOIN player p
            ON sp.player_id = p.player_id
        LEFT JOIN playerstat ps
            ON sp.player_id = ps.player_id
            AND EXISTS (
                SELECT 1 FROM match m2
                WHERE m2.match_id = ps.match_id
                  AND m2.matchday = s.matchday
            )
        WHERE s.user_id = %s AND s.matchday = %s
        ORDER BY p.name ASC
    ''', (user_id, matchday))
    rows = cursor.fetchall()
    cursor.close()

    players = []
    for row in rows:
        pos = row["position"]
        is_captain = row["is_captain"]
        has_stats = row["goals"] is not None

        raw = {}
        for field in STAT_FIELDS:
            raw[field] = row[field] or 0

        stat_points = []
        total = 0

        if has_stats:
            def add_stat(key, label_key, value, multiplier):
                nonlocal total
                if value == 0:
                    return
                raw_pts = value * multiplier
                final_pts = captain_score(raw_pts, is_captain)
                total += final_pts
                stat_points.append({
                    "key": key,
                    "label_key": label_key,
                    "value": value,
                    "multiplier": multiplier,
                    "pts": final_pts,
                    "is_captain_doubled": is_captain,
                })

            if pos in ("FWD", "MID"):
                add_stat("goals", "hts.goal_scored", raw["goals"], 5)
            elif pos == "DEF":
                add_stat("goals", "hts.goal_scored", raw["goals"], 7)
            else:
                add_stat("goals", "hts.goal_scored", raw["goals"], 6)

            add_stat("assists", "hts.assist", raw["assists"], 3)

            if pos in ("DEF", "GK"):
                add_stat("clean_sheet", "hts.clean_sheet", raw["clean_sheet"], 4)

            if pos == "GK":
                add_stat("saves", "hts.saves", raw["saves"], 1)
                add_stat("penalty_saves", "hts.penalty_save", raw["penalty_saves"], 8)

            if pos in ("FWD", "MID"):
                add_stat("shots_on_target", "hts.shots_on_target", raw["shots_on_target"], 1)

            mins = raw["minutes_played"]
            if mins >= 60:
                minute_pts = captain_score(2, is_captain)
                total += minute_pts
                stat_points.append({
                    "key": "minutes",
                    "label_key": "hts.60_plus",
                    "value": mins,
                    "multiplier": 2,
                    "is_flat": True,
                    "pts": minute_pts,
                    "is_captain_doubled": is_captain,
                })
            elif mins > 0:
                minute_pts = captain_score(1, is_captain)
                total += minute_pts
                stat_points.append({
                    "key": "minutes",
                    "label_key": "hts.up_to_60",
                    "value": mins,
                    "multiplier": 1,
                    "is_flat": True,
                    "pts": minute_pts,
                    "is_captain_doubled": is_captain,
                })

            card_val = raw["yellow_cards"] * 1 + raw["red_cards"] * 3
            if card_val > 0:
                raw_card_pts = -card_val
                final_card_pts = captain_score(raw_card_pts, is_captain)
                total += final_card_pts
                stat_points.append({
                    "key": "cards",
                    "label_key": "hts.yellow",
                    "value": card_val,
                    "multiplier": -1,
                    "pts": final_card_pts,
                    "is_captain_doubled": is_captain,
                })

            add_stat("own_goals", "hts.own_goals", raw["own_goals"], -3)
            add_stat("fouls_committed", "hts.fouls_committed", raw["fouls_committed"], -0.5)
            add_stat("offsides", "hts.offsides", raw["offsides"], -0.25)

            if pos in ("DEF", "GK"):
                add_stat("goals_conceded", "hts.goals_conceded", raw["goals_conceded"], -0.5)

        total = round(total, 2)

        players.append({
            "player_id": row["player_id"],
            "name": row["name"],
            "position": pos,
            "is_captain": is_captain,
            "has_stats": has_stats,
            "raw": raw,
            "stat_points": stat_points,
            "total_points": total,
        })

    players.sort(key=lambda p: p["total_points"], reverse=True)
    return {"matchday": matchday, "players": players}

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
               ps.penalty_saves,
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
    psave_pts = 0
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
            raw_psaves = (row["penalty_saves"] or 0) * 8
            psave_pts += captain_score(raw_psaves, is_captain)

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
             + saves_pts + psave_pts + sot_pts + own_goal_pts + foul_pts + offside_pts + gc_pts)

    return {
        "matchday": matchday,
        "goals_pts": goals_pts,
        "assist_pts": assist_pts,
        "cs_pts": cs_pts,
        "minute_pts": minute_pts,
        "card_pts": card_pts,
        "saves_pts": saves_pts,
        "psave_pts": psave_pts,
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


# ── League comparison: user score vs league average per matchday ─────────────

def get_league_comparison(conn, user_id):
    """Compare user's cumulative score vs league average at each matchday.

    Returns list of dicts: [{matchday, user_score, league_avg}]
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
                AND (u.role != 'admin' OR s.user_id = %s)
            GROUP BY s.user_id, s.matchday
        ),
        cumulative AS (
            SELECT
                user_id,
                md,
                SUM(md_score) OVER (
                    PARTITION BY user_id ORDER BY md
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) AS cum_score
            FROM user_scores
        )
        SELECT md AS matchday,
               AVG(CASE WHEN user_id != %s THEN cum_score END) AS league_avg,
               MAX(CASE WHEN user_id = %s THEN cum_score END) AS user_score
        FROM cumulative
        GROUP BY md
        ORDER BY md ASC
    ''', (user_id, user_id, user_id))
    rows = cursor.fetchall()
    cursor.close()

    result = []
    for row in rows:
        league_avg = float(row["league_avg"]) if row["league_avg"] else 0
        user_score = float(row["user_score"]) if row["user_score"] else 0
        result.append({
            "matchday": row["matchday"],
            "user_score": round(user_score, 2),
            "league_avg": round(league_avg, 2),
        })
    return result

def get_dashboard_score_data(conn, user_id):
    """Fetch every score-chart series for the dashboard in two aggregate queries."""
    cursor = conn.cursor()
    cursor.execute(f'''
        SELECT s.matchday, ps.player_id, p.name, p.position, sp.is_captain,
               SUM({captain_score_sql()}) AS player_score
        FROM squad s
        JOIN squadplayer sp ON s.squad_id = sp.squad_id
        JOIN player p ON sp.player_id = p.player_id
        JOIN playerstat ps ON sp.player_id = ps.player_id
        JOIN match m ON ps.match_id = m.match_id AND m.matchday = s.matchday
        WHERE s.user_id = %s
        GROUP BY s.matchday, ps.player_id, p.name, p.position, sp.is_captain
        ORDER BY s.matchday ASC, p.name ASC
    ''', (user_id,))
    score_rows = cursor.fetchall()

    cursor.execute('''
        SELECT
            s.matchday,
            SUM(CASE WHEN sp.is_captain THEN
                (CASE WHEN p.position IN ('FWD', 'MID') THEN COALESCE(ps.goals, 0) * 5
                      WHEN p.position = 'DEF' THEN COALESCE(ps.goals, 0) * 7
                      ELSE COALESCE(ps.goals, 0) * 6 END) * 2
                ELSE CASE WHEN p.position IN ('FWD', 'MID') THEN COALESCE(ps.goals, 0) * 5
                          WHEN p.position = 'DEF' THEN COALESCE(ps.goals, 0) * 7
                          ELSE COALESCE(ps.goals, 0) * 6 END END) AS goals_pts,
            SUM(CASE WHEN sp.is_captain THEN COALESCE(ps.assists, 0) * 6 ELSE COALESCE(ps.assists, 0) * 3 END) AS assist_pts,
            SUM(CASE WHEN p.position IN ('DEF', 'GK') THEN
                CASE WHEN sp.is_captain THEN COALESCE(ps.clean_sheet, 0) * 8 ELSE COALESCE(ps.clean_sheet, 0) * 4 END
                ELSE 0 END) AS cs_pts,
            SUM(CASE WHEN sp.is_captain THEN
                CASE WHEN COALESCE(ps.minutes_played, 0) >= 60 THEN 4 WHEN COALESCE(ps.minutes_played, 0) > 0 THEN 2 ELSE 0 END
                ELSE CASE WHEN COALESCE(ps.minutes_played, 0) >= 60 THEN 2 WHEN COALESCE(ps.minutes_played, 0) > 0 THEN 1 ELSE 0 END END) AS minute_pts,
            SUM(CASE WHEN sp.is_captain THEN -2 * (COALESCE(ps.yellow_cards, 0) + COALESCE(ps.red_cards, 0) * 3)
                ELSE -(COALESCE(ps.yellow_cards, 0) + COALESCE(ps.red_cards, 0) * 3) END) AS card_pts,
            SUM(CASE WHEN p.position = 'GK' THEN CASE WHEN sp.is_captain THEN COALESCE(ps.saves, 0) * 2 ELSE COALESCE(ps.saves, 0) END ELSE 0 END) AS saves_pts,
            SUM(CASE WHEN p.position = 'GK' THEN CASE WHEN sp.is_captain THEN COALESCE(ps.penalty_saves, 0) * 16 ELSE COALESCE(ps.penalty_saves, 0) * 8 END ELSE 0 END) AS psave_pts,
            SUM(CASE WHEN p.position IN ('FWD', 'MID') THEN CASE WHEN sp.is_captain THEN COALESCE(ps.shots_on_target, 0) * 2 ELSE COALESCE(ps.shots_on_target, 0) END ELSE 0 END) AS sot_pts,
            SUM(CASE WHEN sp.is_captain THEN COALESCE(ps.own_goals, 0) * -6 ELSE COALESCE(ps.own_goals, 0) * -3 END) AS own_goal_pts,
            SUM(CASE WHEN sp.is_captain THEN COALESCE(ps.fouls_committed, 0) * -1 ELSE COALESCE(ps.fouls_committed, 0) * -0.5 END) AS foul_pts,
            SUM(CASE WHEN sp.is_captain THEN COALESCE(ps.offsides, 0) * -0.5 ELSE COALESCE(ps.offsides, 0) * -0.25 END) AS offside_pts,
            SUM(CASE WHEN p.position IN ('DEF', 'GK') THEN CASE WHEN sp.is_captain THEN COALESCE(ps.goals_conceded, 0) * -1 ELSE COALESCE(ps.goals_conceded, 0) * -0.5 END ELSE 0 END) AS gc_pts
        FROM squad s
        JOIN squadplayer sp ON s.squad_id = sp.squad_id
        JOIN player p ON sp.player_id = p.player_id
        JOIN playerstat ps ON sp.player_id = ps.player_id
        JOIN match m ON ps.match_id = m.match_id AND m.matchday = s.matchday
        WHERE s.user_id = %s
        GROUP BY s.matchday
        ORDER BY s.matchday ASC
    ''', (user_id,))
    composition_rows = cursor.fetchall()
    cursor.close()

    by_matchday = []
    score_breakdowns = []
    current_matchday = None
    current_breakdown = []
    current_total = 0

    for row in score_rows:
        matchday = row["matchday"]
        if current_matchday is not None and matchday != current_matchday:
            by_matchday.append({"matchday": current_matchday, "squad_score": current_total})
            score_breakdowns.append({"matchday": current_matchday, "breakdown": current_breakdown})
            current_breakdown = []
            current_total = 0
        current_matchday = matchday
        player_score = float(row["player_score"] or 0)
        current_total += player_score
        current_breakdown.append({
            "player_id": row["player_id"],
            "player_name": row["name"],
            "position": row["position"],
            "player_score": player_score,
            "is_captain": row["is_captain"],
        })

    if current_matchday is not None:
        by_matchday.append({"matchday": current_matchday, "squad_score": current_total})
        score_breakdowns.append({"matchday": current_matchday, "breakdown": current_breakdown})

    compositions = []
    for row in composition_rows:
        composition = {"matchday": row["matchday"]}
        total = 0
        keys = [
            "goals_pts", "assist_pts", "cs_pts", "minute_pts", "card_pts", "saves_pts",
            "psave_pts", "sot_pts", "own_goal_pts", "foul_pts", "offside_pts", "gc_pts",
        ]
        for key in keys:
            value = float(row[key] or 0)
            composition[key] = value
            total += value
        composition["total"] = total
        compositions.append(composition)

    latest_matchday = None
    if by_matchday:
        latest_matchday = by_matchday[-1]["matchday"]

    return {
        "by_matchday": by_matchday,
        "score_breakdowns": score_breakdowns,
        "compositions": compositions,
        "latest_matchday": latest_matchday,
    }