def get_transfers(conn, user_id, matchday = None):
    cursor = conn.cursor()
    query = '''
        SELECT transfer_id, player_in_id, p_in.name AS player_in_name,
        player_out_id, p_out.name AS player_out_name, matchday
        FROM transfers tr
        JOIN player as p_in
            ON tr.player_in_id = p_in.player_id
        JOIN player as p_out
            ON tr.player_out_id = p_out.player_id
        '''
    filters = ["tr.user_id = %s"]
    values = [user_id]

    if matchday is not None:
        filters.append("matchday = %s")
        values.append(matchday)
    query += " WHERE " + " AND ".join(filters)
    query += " ORDER BY matchday ASC"

    cursor.execute(query, values)
    results = cursor.fetchall()
    cursor.close()
    return results

def post_transfer(conn, user_id, player_in_id, player_out_id, matchday):
    cursor = conn.cursor()
    try:
        # If no squad exists for this matchday, copy forward from the most recent prior one.
        cursor.execute(
            "SELECT squad_id FROM squad WHERE user_id = %s AND matchday = %s",
            (user_id, matchday)
        )
        existing = cursor.fetchone()

        if existing:
            squad_id = existing["squad_id"]
        else:
            cursor.execute(
                "SELECT squad_id, budget_used FROM squad WHERE user_id = %s AND matchday < %s ORDER BY matchday DESC LIMIT 1",
                (user_id, matchday)
            )
            source = cursor.fetchone()
            if not source:
                raise ValueError(f"No squad to carry forward for user {user_id}")

            cursor.execute(
                "INSERT INTO squad (user_id, matchday, budget_used) VALUES (%s, %s, %s) RETURNING squad_id",
                (user_id, matchday, source["budget_used"])
            )
            squad_id = cursor.fetchone()["squad_id"]

            cursor.execute(
                "INSERT INTO squadplayer (squad_id, player_id) SELECT %s, player_id FROM squadplayer WHERE squad_id = %s",
                (squad_id, source["squad_id"])
            )

        # Log the transfer
        cursor.execute(
            "INSERT INTO transfers (user_id, player_in_id, player_out_id, matchday) VALUES (%s, %s, %s, %s) RETURNING transfer_id",
            (user_id, player_in_id, player_out_id, matchday)
        )
        transfer_id = cursor.fetchone()["transfer_id"]

        # Swap the players
        cursor.execute("DELETE FROM squadplayer WHERE player_id = %s AND squad_id = %s", (player_out_id, squad_id))
        cursor.execute("INSERT INTO squadplayer (squad_id, player_id) VALUES (%s, %s)", (squad_id, player_in_id))

        # Update budget
        cursor.execute(
            "SELECT player_id, base_price FROM player WHERE player_id IN (%s, %s)",
            (player_in_id, player_out_id)
        )
        prices = {row["player_id"]: row["base_price"] for row in cursor.fetchall()}
        cursor.execute(
            "UPDATE squad SET budget_used = budget_used - %s + %s WHERE user_id = %s AND matchday = %s",
            (prices[player_out_id], prices[player_in_id], user_id, matchday)
        )

        cursor.execute("SELECT budget_used FROM squad WHERE squad_id = %s", (squad_id,))
        new_budget = cursor.fetchone()["budget_used"]

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()

    return transfer_id, new_budget

# check transfer count
def count_transfers(conn, user_id, matchday):
    cursor = conn.cursor()
    cursor.execute('''
        SELECT COUNT(*) FROM transfers
        WHERE user_id = %s AND matchday = %s
    ''', (user_id, matchday))
    count = cursor.fetchone()["count"]
    cursor.close()
    return count






