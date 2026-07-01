# get score 
def get_score(conn, user_id, matchday=None):
    cursor = conn.cursor()
    
    if matchday is not None:
        # inside a squad, get players' scores for specific matchday.
        # join match so we only count stats from this matchday's fixtures.
        # captain's score is doubled (x2).
        cursor.execute('''
            SELECT ps.player_id, p.name, p.position,
                   CASE WHEN sp.is_captain = true THEN ps.score * 2 ELSE ps.score END AS score,
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
        # get cumulative score of the squad by matchday (captain x2 applied per matchday)
        cursor.execute('''
            SELECT s.matchday, SUM(
                CASE WHEN sp.is_captain = true THEN ps.score * 2 ELSE ps.score END
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

# 
