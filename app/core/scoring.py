def calculate_score(goals, assists, minutes_played, yellow_cards, red_cards, clean_sheet, position):
    score = 0
    
    # goals
    if position in ["FWD", "MID"]:
        score += goals * 5
    elif position == "DEF" or position == "GK":
        score += goals * 6
    
    # assists
    if assists:
         score += assists * 3
    
    # clean sheet
    if position in ["DEF", "GK"]:
        score += clean_sheet * 4
    
    # minutes played
    if minutes_played >= 60:
        score += 2
    elif 0 < minutes_played < 60:
        score += 1

    # cards
    score -= yellow_cards * 1
    score -= red_cards * 3
   
    return score

