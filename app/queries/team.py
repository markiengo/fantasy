def get_teams(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT team_id, name, fifa_ranking, elo_rating, group_stage FROM team")
    results = cursor.fetchall()   
    cursor.close()
    return results 