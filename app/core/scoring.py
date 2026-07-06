def calculate_score(goals, assists, minutes_played, yellow_cards, red_cards,
                    clean_sheet, position, saves=0, own_goals=0,
                    shots_on_target=0, fouls_committed=0, offsides=0,
                    goals_conceded=0):
    score = 0

    # goals
    if position in ["FWD", "MID"]:
        score += goals * 5
    elif position == "DEF":
        score += goals * 7
    elif position == "GK":
        score += goals * 6

    # assists
    if assists:
         score += assists * 3

    # clean sheet
    if position in ["DEF", "GK"]:
        score += clean_sheet * 4

    # saves (GK only)
    if position == "GK":
        score += saves * 1

    # shots on target (FWD/MID only)
    if position in ["FWD", "MID"]:
        score += shots_on_target * 1

    # minutes played
    if minutes_played >= 60:
        score += 2
    elif 0 < minutes_played < 60:
        score += 1

    # cards
    score -= yellow_cards * 1
    score -= red_cards * 3

    # own goals (all positions)
    score -= own_goals * 3

    # fouls committed (all positions)
    score -= fouls_committed * 0.5

    # offsides (all positions)
    score -= offsides * 0.25

    # goals conceded (GK/DEF only)
    if position in ["DEF", "GK"]:
        score -= goals_conceded * 0.5

    return score


def captain_score(score, is_captain):
    if is_captain:
        return score * 2
    return score


def captain_score_sql(sp_alias="sp", ps_alias="ps"):
    return f"""
CASE
    WHEN {sp_alias}.is_captain = true THEN {ps_alias}.score * 2
    ELSE {ps_alias}.score
END
"""
