from app.core.scoring import calculate_score

# get player stats 
def get_playerstats(conn, match_id = None, player_id = None):
    cursor = conn.cursor()
    query = '''
        SELECT stat_id, playerstat.player_id, player.name as player_name, match_id, goals, 
        assists, minutes_played, yellow_cards, red_cards, clean_sheet, score,
        saves, own_goals, shots_on_target, fouls_committed, offsides, goals_conceded
        FROM playerstat 
        JOIN player 
            ON playerstat.player_id = player.player_id
    '''
    
    filters = []
    values = []
    
    if match_id is not None:
        filters.append("playerstat.match_id = %s")
        values.append(match_id)
    if player_id is not None:
        filters.append("playerstat.player_id = %s")
        values.append(player_id)
    if filters:
        query += " WHERE " + " AND ".join(filters)
    query += " ORDER BY playerstat.match_id ASC, player.name ASC"
    
    cursor.execute(query, values)
    result = cursor.fetchall()
    cursor.close()
    return result


def get_top_stats(conn, limit=5):
    cursor = conn.cursor()
    query = """
        SELECT
            p.player_id,
            p.name,
            p.position,
            t.team_id,
            t.name AS team_name,
            SUM(ps.goals) AS total_goals,
            SUM(ps.assists) AS total_assists,
            SUM(ps.goals + ps.assists) AS total_goal_involvements,
            SUM(ps.minutes_played) AS total_minutes,
            SUM(ps.clean_sheet) AS total_clean_sheets,
            SUM(ps.yellow_cards) AS total_yellow_cards,
            SUM(ps.red_cards) AS total_red_cards,
            SUM(ps.saves) AS total_saves,
            SUM(ps.score) AS total_score
        FROM playerstat ps
        JOIN player p ON ps.player_id = p.player_id
        JOIN team t ON p.team_id = t.team_id
        GROUP BY p.player_id, p.name, p.position, t.team_id, t.name
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()

    def top_n(rows, key, reverse=True):
        keyfunc = key if callable(key) else lambda r: r[key]
        sorted_rows = sorted(rows, key=keyfunc, reverse=reverse)
        return sorted_rows[:limit]

    return {
        "top_fantasy_score": [
            {"player_id": r["player_id"], "name": r["name"], "position": r["position"], "team_id": r["team_id"], "team_name": r["team_name"], "value": float(r["total_score"] or 0)}
            for r in top_n(rows, "total_score")
        ],
        "top_scorers": [
            {"player_id": r["player_id"], "name": r["name"], "position": r["position"], "team_id": r["team_id"], "team_name": r["team_name"], "value": int(r["total_goals"] or 0)}
            for r in top_n(rows, "total_goals")
        ],
        "top_assists": [
            {"player_id": r["player_id"], "name": r["name"], "position": r["position"], "team_id": r["team_id"], "team_name": r["team_name"], "value": int(r["total_assists"] or 0)}
            for r in top_n(rows, "total_assists")
        ],
        "top_goal_involvements": [
            {"player_id": r["player_id"], "name": r["name"], "position": r["position"], "team_id": r["team_id"], "team_name": r["team_name"], "value": int(r["total_goal_involvements"] or 0)}
            for r in top_n(rows, "total_goal_involvements")
        ],
        "top_clean_sheets": [
            {"player_id": r["player_id"], "name": r["name"], "position": r["position"], "team_id": r["team_id"], "team_name": r["team_name"], "value": int(r["total_clean_sheets"] or 0)}
            for r in top_n(rows, "total_clean_sheets")
        ],
        "top_cards": [
            {
                "player_id": r["player_id"],
                "name": r["name"],
                "position": r["position"],
                "team_id": r["team_id"],
                "team_name": r["team_name"],
                "value": int((r["total_yellow_cards"] or 0) + (r["total_red_cards"] or 0)),
                "yellow_cards": int(r["total_yellow_cards"] or 0),
                "red_cards": int(r["total_red_cards"] or 0),
            }
            for r in top_n(rows, lambda r: (r["total_yellow_cards"] or 0) + (r["total_red_cards"] or 0))
        ],
        "top_saves": [
            {"player_id": r["player_id"], "name": r["name"], "position": r["position"], "team_id": r["team_id"], "team_name": r["team_name"], "value": int(r["total_saves"] or 0)}
            for r in top_n(rows, "total_saves")
        ],
    }


def post_playerstats_batch(conn, match_id, stats_list):
    if not stats_list:
        return 0, 0

    player_ids = [s["player_id"] for s in stats_list]
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT player_id, position FROM player WHERE player_id = ANY(%s)",
            (player_ids,),
        )
        position_map = {}
        for row in cursor.fetchall():
            position_map[row["player_id"]] = row["position"]

        values = []
        for s in stats_list:
            pos = position_map.get(s["player_id"])
            if pos is None:
                continue
            clean_sheet = s["clean_sheet"] if s["minutes_played"] > 0 else 0
            saves = s.get("saves", 0) if pos == "GK" else 0
            score = calculate_score(
                s["goals"], s["assists"], s["minutes_played"],
                s["yellow_cards"], s["red_cards"], clean_sheet, pos,
                saves=saves,
                own_goals=s.get("own_goals", 0),
                shots_on_target=s.get("shots_on_target", 0),
                fouls_committed=s.get("fouls_committed", 0),
                offsides=s.get("offsides", 0),
                goals_conceded=s.get("goals_conceded", 0),
            )
            values.append((
                s["player_id"], match_id, s["goals"], s["assists"],
                s["minutes_played"], s["yellow_cards"], s["red_cards"],
                clean_sheet, score, saves,
                s.get("own_goals", 0), s.get("shots_on_target", 0),
                s.get("fouls_committed", 0), s.get("offsides", 0),
                s.get("goals_conceded", 0),
            ))

        if not values:
            return 0, 0

        placeholders = ",".join(["(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"] * len(values))
        flat = tuple(v for row in values for v in row)
        cursor.execute(
            "INSERT INTO playerstat (player_id, match_id, goals, assists, minutes_played, yellow_cards, red_cards, clean_sheet, score, saves, own_goals, shots_on_target, fouls_committed, offsides, goals_conceded) VALUES "
            + placeholders + " ON CONFLICT (player_id, match_id) DO UPDATE SET goals = EXCLUDED.goals, assists = EXCLUDED.assists, minutes_played = EXCLUDED.minutes_played, yellow_cards = EXCLUDED.yellow_cards, red_cards = EXCLUDED.red_cards, clean_sheet = EXCLUDED.clean_sheet, score = EXCLUDED.score, saves = EXCLUDED.saves, own_goals = EXCLUDED.own_goals, shots_on_target = EXCLUDED.shots_on_target, fouls_committed = EXCLUDED.fouls_committed, offsides = EXCLUDED.offsides, goals_conceded = EXCLUDED.goals_conceded",
            flat,
        )
        inserted = cursor.rowcount
        conn.commit()
        return inserted, len(values) - inserted
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()













