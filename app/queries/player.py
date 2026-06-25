def get_players(conn, name = None, position = None, team_id = None, max_price = None):
    cursor = conn.cursor()
    query = '''
    SELECT p.player_id, p.name, p.position, p.team_id,
           t.name AS team_name, p.base_price
    FROM player p
    JOIN team t
        ON p.team_id = t.team_id
    WHERE p.in_tournament = true
    '''
    filters = []
    values = []

    if name:
        filters.append("p.name ILIKE %s")
        values.append(f"%{name}%")
    if position:
        filters.append("p.position = %s")
        values.append(position)
    if team_id:
        filters.append("p.team_id = %s")
        values.append(team_id)
    if max_price:
        filters.append("p.base_price <= %s")
        values.append(max_price)
    if filters:
        query += " AND " + " AND ".join(filters)

    cursor.execute(query, values)
    results = cursor.fetchall()
    cursor.close()
    return results 
        

def get_player(conn, player_id):
    cursor = conn.cursor()
    cursor.execute('''
        SELECT p.player_id, p.name, p.position, p.team_id,
               t.name AS team_name, p.base_price
        FROM player p
        JOIN team t
            ON p.team_id = t.team_id
        WHERE p.player_id = %s
        ''', (player_id,))
    result = cursor.fetchone()
    cursor.close()
    return result





