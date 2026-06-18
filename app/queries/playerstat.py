from app.core.scoring import calculate_score

# get player stats 
def get_playerstats(conn, match_id = None, player_id = None):
    cursor = conn.cursor()
    query = '''
        SELECT stat_id, playerstat.player_id, name as player_name, match_id, goals, 
        assists, minutes_played, yellow_cards, red_cards, clean_sheet, score
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
    
    cursor.execute(query, values)
    result = cursor.fetchall()
    cursor.close()
    return result

# upload player stats 
def post_playerstats(conn, player_id, match_id, goals, assists, minutes_played, yellow_cards, red_cards, clean_sheet):
    cursor = conn.cursor()
    
    # grab position to calculate score
    cursor.execute('''
        SELECT position FROM player WHERE player_id = %s
    ''', (player_id,))
    position = cursor.fetchone()["position"]
    score = calculate_score(goals, assists, minutes_played, yellow_cards, red_cards, clean_sheet, position)
    
    # query to insert stat
    cursor.execute('''
        INSERT INTO playerstat (player_id, match_id, goals, assists, minutes_played, yellow_cards, red_cards, clean_sheet, score)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING stat_id
    ''', (player_id, match_id, goals, assists, minutes_played, yellow_cards, red_cards, clean_sheet, score))
    stat_id = cursor.fetchone()["stat_id"]
    conn.commit()
    cursor.close()

    return stat_id, score













