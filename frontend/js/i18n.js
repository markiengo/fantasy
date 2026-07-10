const I18n = (() => {
  const STORAGE_KEY = "gaffer_lang";
  let _lang = "en";

  const dict = {
    en: {
      /* ── Login screen ── */
      "login.welcome_back": "Welcome back",
      "login.subtitle": "Sign in to manage your fantasy squad and track your World Cup journey",
      "login.display_name": "Display name",
      "login.display_name_placeholder": "2-30 characters",
      "login.email_or_username": "Email or Username",
      "login.email": "Email",
      "login.enter_email_or_username": "Enter email or username",
      "login.enter_email": "Enter your email",
      "login.password": "Password",
      "login.show_password": "Show password",
      "login.hide_password": "Hide password",
      "login.remember_me": "Remember me",
      "login.forgot_password": "Forgot password?",
      "login.log_in": "Log In",
      "login.sign_up": "Sign Up",
      "login.sign_in_google": "Sign In with Google",
      "login.sign_up_google": "Sign Up with Google",
      "login.or": "Or",
      "login.dont_have_account": "Don't have an account?",
      "login.already_have_account": "Already have an account?",
      "login.remember_password": "Remember your password?",
      "login.create_account": "Create account",
      "login.reset_password": "Reset password",
      "login.reset_subtitle": "Enter your email and we'll send you a reset link",
      "login.send_reset_link": "Send reset link",

      /* ── Auth overlay ── */
      "auth.check_email": "Check your email",
      "auth.confirmation_sent": "We sent a confirmation link to",
      "auth.click_to_activate": "Click the link to activate your account.",
      "auth.reset_sent": "Reset link sent",
      "auth.reset_link_sent": "We sent a password reset link to",
      "auth.check_inbox": "Check your inbox and follow the link to reset your password.",
      "auth.back_to_login": "Back to login",

      /* ── Username modal ── */
      "username.choose": "Choose your display name",
      "username.subtitle": "Pick a name for the fantasy league.",
      "username.placeholder": "2-30 characters",
      "username.choose_btn": "Choose display name",
      "username.available": "Available",
      "username.taken": "Already taken",
      "username.invalid": "Display name must be 2-30 characters.",
      "username.could_not_set": "Could not set display name.",
      "username.profile_completed": "Profile already completed.",

      /* ── Sidebar ── */
      "nav.menu": "MENU",
      "nav.squad": "Squad",
      "nav.fixtures": "Fixtures",
      "nav.dashboard": "Dashboard",
      "nav.top_stats": "Top Stats",
      "nav.leaderboard": "Leaderboard",
      "nav.sign_out": "Sign out",
      "nav.toggle_menu": "Toggle menu",
      "nav.gaffer_home": "Gaffer home",
      "nav.open_onboarding": "Open onboarding",

      /* ── Sidebar footer ── */
      "sidebar.deadline": "DEADLINE",
      "sidebar.open": "OPEN",
      "sidebar.update_data": "Update Data",
      "sidebar.update_subtitle": "Sync completed match stats",
      "sidebar.update_tooltip": "Load completed match stats from ESPN",
      "sidebar.manager": "Manager",

      /* ── Topbar ── */
      "topbar.team_eyebrow": "TEAM MANAGEMENT",
      "topbar.team_title": "Build your matchday squad",
      "topbar.fixtures_eyebrow": "TOURNAMENT",
      "topbar.fixtures_title": "Fixtures & standings",
      "topbar.scores_eyebrow": "PERFORMANCE",
      "topbar.scores_title": "Season dashboard",
      "topbar.stats_eyebrow": "TOURNAMENT",
      "topbar.stats_title": "Top player stats",
      "topbar.leaderboard_eyebrow": "COMPETITION",
      "topbar.leaderboard_title": "Global leaderboard",
      "topbar.total_points": "Total points",
      "topbar.switch_dark": "Switch to dark mode",
      "topbar.switch_light": "Switch to light mode",
      "topbar.replay_tour": "Replay guided tour",
      "topbar.how_points": "How points are calculated",
      "nav.prev_round": "Previous round",
      "nav.next_round": "Next round",
      "nav.aria_matchday": "Matchday",
      "nav.aria_squad": "Squad",
      "nav.aria_squad_sections": "Squad sections",
      "nav.aria_squad_pitch": "Squad pitch",
      "nav.aria_fixtures": "Fixtures",
      "nav.aria_dashboard": "Dashboard",
      "nav.aria_top_stats": "Top Stats",
      "nav.aria_leaderboard": "Leaderboard",
      "nav.aria_player_pool": "Player pool",
      "nav.aria_right_panel": "Right panel",
      "nav.aria_fixture_views": "Fixture views",
      "nav.aria_scoring_by_position": "Scoring by position",

      /* ── Matchday desk ── */
      "desk.label": "MATCHDAY DESK",
      "desk.build": "Build",
      "desk.live_points": "Live matchday points",
      "desk.captain_x2": "CAPTAIN X2",
      "desk.auto_pick": "Auto pick",
      "desk.matchday": "MATCHDAY",

      /* ── Squad summary ── */
      "summary.label": "SQUAD SUMMARY",
      "summary.players": "Players",
      "summary.formation": "Formation",
      "summary.budget_used": "Budget used",
      "summary.remaining": "Remaining",
      "summary.transfers": "Transfers",
      "summary.pressure": "Pressure",

      /* ── Actions ── */
      "action.save_squad": "Save squad",
      "action.make_transfers": "Edit squad",
      "action.confirm": "Confirm",
      "action.cancel": "Cancel",

      /* ── Mobile tabs ── */
      "tab.pitch": "Pitch",
      "tab.players": "Players",
      "tab.summary": "Summary",

      /* ── Pitch ── */
      "pitch.your_xi": "YOUR XI",
      "pitch.your_xi_round": "YOUR XI — {0} ({1})",
      "pitch.tap_to_start": "Tap an empty slot to start",
      "pitch.tap_player": "Tap a player to view options",
      "pitch.add_a": "Add {0}",
      "pitch.remove": "Remove {0}",
      "date.locale": "en-US",
      "lb.captain_picks_title": "Captain picks: {0}",

      /* ── Player pool ── */
      "pool.label": "PLAYER POOL",
      "pool.how_to_score": "How to score",
      "pool.search": "Search",
      "pool.search_players": "Search players",
      "pool.all": "All",
      "pool.teams": "Teams",
      "pool.filter_teams": "Filter teams",
      "pool.price_range": "Price range",
      "pool.any": "Any",
      "pool.sort": "Sort",
      "pool.load_more": "Load more",
      "pool.no_match": "No players match these filters.",
      "pool.no_teams": "No teams match.",
      "pool.showing": "Showing {0} of {1}",
      "pool.player_count": "{0} player",
      "pool.player_count_plural": "{0} players",

      /* ── Pool badges ── */
      "badge.in_squad": "\u2713 In squad",
      "badge.over_budget": "Over $50m",
      "badge.squad_full": "Squad full",
      "badge.max_3": "Max 3",
      "badge.slot_full": "Slot full",
      "badge.locked": "Locked",

      /* ── Score tabs ── */
      "score.all_players": "All players",
      "score.gk_def": "GK & DEF",
      "score.mid_fwd": "MID & FWD",
      "score.deductions": "Deductions",

      /* ── Fixtures ── */
      "fixtures.table": "Table & Fixtures",
      "fixtures.bracket": "Knockout Bracket",
      "fixtures.fifa": "FIFA World Cup",
      "fixtures.subtitle": "Tables, match schedule, and knockout context.",
      "fixtures.matches": "Matches",
      "fixtures.stage": "Stage",
      "fixtures.times_local": "TIMES IN LOCAL",
      "fixtures.no_group_data": "No group data yet.",
      "fixtures.no_fixtures": "No fixtures for this round yet.",
      "fixtures.tbd": "TBD",
      "fixtures.champion": "CHAMPION",
      "fixtures.group": "Group {0}",
      "fixtures.col_team": "Team",
      "fixtures.col_pl": "PL",
      "fixtures.col_w": "W",
      "fixtures.col_d": "D",
      "fixtures.col_l": "L",
      "fixtures.col_gd": "GD",
      "fixtures.col_pts": "PTS",
      "fixtures.col_form": "Form",
      "fixtures.col_next": "Next",

      /* ── Knockout round names ── */
      "ko.round_of_32": "ROUND OF 32",
      "ko.round_of_16": "ROUND OF 16",
      "ko.quarterfinals": "QUARTERFINALS",
      "ko.semifinals": "SEMIFINALS",
      "ko.final": "FINAL",

      /* ── Dashboard ── */
      "dash.matchday": "Matchday",
      "dash.section_overview": "Overview",
      "dash.section_squad": "Squad Analysis",
      "dash.section_breakdown": "Breakdown",
      "dash.total_points": "TOTAL POINTS",
      "dash.live_squad": "Live squad",
      "dash.in_bank": "In the bank",
      "dash.active_squad": "Active squad",
      "dash.score_composition": "Score composition",
      "dash.where_points": "Where points come from",
      "dash.adds": "Adds",
      "dash.deductions": "Deductions",
      "dash.captain_impact": "Captain impact",
      "dash.captain_vs_avg": "Captain x2 vs squad avg",
      "dash.rank_trajectory": "Rank trajectory",
      "dash.your_position": "Your position across matchdays",
      "dash.top_scorers": "Top scorers",
      "dash.value_for_money": "Value for money",
      "dash.price_vs_points": "Price vs points",
      "dash.efficiency": "Efficiency",
      "dash.points_per_m": "Points per $m",
      "dash.position_contribution": "Position contribution",
      "dash.transfer_history": "Transfer history",
      "dash.click_to_expand": "Click a matchday to expand",
      "dash.no_player_data": "No player data for this matchday.",
      "dash.no_data_md": "No data for this matchday.",
      "dash.no_transfers": "No transfers made yet.",
      "dash.no_data": "No data",
      "dash.player_breakdown": "Player breakdown",
      "dash.stat_by_stat": "Stat by stat breakdown",
      "dash.dnp": "DNP",
      "dash.captain_x2": "Captain x2",
      "dash.total": "Total",
      "dash.vs_league": "You vs league average",
      "dash.your_score_vs_avg": "Your cumulative score vs league average",
      "dash.matchday_insights": "Matchday insights",
      "dash.mvp": "MVP",
      "dash.flop": "Flop",
      "dash.transfer_impact": "Transfer impact",
      "dash.net_from_transfers": "net from {0} transfers",
      "dash.transfer_count": "{0} transfer",
      "dash.transfer_count_plural": "{0} transfers",
      "dash.out": "OUT",
      "dash.in": "IN",
      "dash.even": "even",
      "dash.unknown": "Unknown",
      "dash.pts_per_m": "pts/$m",

      /* ── Stats ── */
      "stats.fantasy_points": "Fantasy points",
      "stats.top_scorers": "Top scorers",
      "stats.assists": "Assists",
      "stats.goal_involvements": "Goal involvements",
      "stats.clean_sheets": "Clean sheets",
      "stats.most_cards": "Most Cards",
      "stats.top_saves": "Top Saves",
      "stats.top_penalty_saves": "Penalty Saves",
      "stats.hint_psv": "Penalty Saves",
      "stats.hint_total": "Total",
      "stats.hint_saves": "Saves",
      "stats.hint_goals": "Goals",
      "stats.hint_assists": "Assists",
      "stats.hint_ga": "Goals + Assists",
      "stats.hint_def_gk": "DEF / GK",
      "stats.hint_yr": "Yellow + Red",
      "stats.no_data": "No data yet.",
      "stats.failed": "Failed to load stats.",
      "stats.pts": "pts",

      /* ── Leaderboard ── */
      "lb.standings": "STANDINGS",
      "lb.title": "Leaderboard",
      "lb.subtitle": "See how you stack up against every manager.",
      "lb.overall": "Overall",
      "lb.by_matchday": "By Matchday",
      "lb.popular": "Popular Picks",
      "lb.leader": "Leader",
      "lb.you": "You",
      "lb.admin": "Admin",
      "lb.managers": "Managers",
      "lb.rank": "Rank",
      "lb.manager": "Manager",
      "lb.pts": "Pts",
      "lb.delta": "vs last",
      "lb.before_ko": "Before Kickoff",
      "lb.none": "None",
      "lb.unranked": "Unranked",
      "lb.no_data_md": "No leaderboard data for this matchday yet.",
      "lb.no_data": "No leaderboard data yet.",
      "lb.no_popular": "No popular picks data for this matchday yet.",
      "lb.pick_rate": "Pick Rate",
      "lb.picks": "picks",
      "lb.captain_s": "captain",
      "lb.captain_p": "captains",
      "lb.manager_n": "Manager {0}",

      /* ── Welcome overlay ── */
      "welcome.label": "GAFFER CONTROL ROOM",
      "welcome.title": "Set your matchday desk",
      "welcome.lede": "Build an XI, stay under budget, watch the tournament state, and confirm transfers only when the window is open.",
      "welcome.choose_shape": "Choose a shape",
      "welcome.shape_desc": "Switch between 4-3-3 and 4-4-2.",
      "welcome.respect_rules": "Respect rules",
      "welcome.rules_desc": "11 players, max 3 per team (scales up in knockouts), $50.0m cap.",
      "welcome.add_players": "Add players",
      "welcome.add_desc": "Filter the pool by position, team, or price. Click + to add.",
      "welcome.track": "Track everything",
      "welcome.track_desc": "Fixtures, standings, top stats, and your dashboard stay live.",
      "welcome.show_me": "Show me how",
      "welcome.got_it": "Got it",

      /* ── Score overlay ── */
      "score_overlay.label": "SCORING ENGINE",
      "score_overlay.title": "How Points are Calculated",
      "score_overlay.close": "Close scoring guide",
      "score_overlay.game_rules": "Game Rules",
      "score_overlay.prize_pool": "PRIZE POOL",
      "score_overlay.1st": "1st",
      "score_overlay.2nd": "2nd",
      "score_overlay.3rd": "3rd",

      /* ── Transfer warning ── */
      "warning.label": "UNSAVED CHANGES",
      "warning.title": "You have unsaved changes",
      "warning.body_squad": "You have unsaved squad changes that will be lost if you leave. Save your squad or stay to keep editing.",
      "warning.body_transfers": "You have unsaved transfers that will be lost if you leave. Confirm your transfers or cancel to keep editing.",
      "warning.body_input": "You have unsaved text in a search or form field that will be lost if you leave or refresh.",
      "warning.stay": "Stay and edit",
      "warning.leave": "Leave anyway",
      "warning.pending_transfers": "You have pending transfer changes",

      /* ── Stage labels ── */
      "stage.group_stage": "Round {0}",
      "stage.round_of_32": "Round of 32",
      "stage.round_of_16": "Round of 16",
      "stage.quarter_final": "Quarterfinals",
      "stage.semi_final": "Semifinals",
      "stage.final": "Final",
      "stage.group_stage_plain": "Group stage",

      /* ── Toasts & messages ── */
      "toast.session_expired": "Session expired. Please sign in again.",
      "toast.no_permission": "You do not have permission to do that.",
      "toast.google_failed": "Google sign-in failed",
      "toast.auth_failed": "Authentication failed",
      "toast.load_failed": "Could not load data. Retry the request.",
      "toast.verify_failed": "Could not verify your session. Please sign in again.",
      "toast.save_before_transfers": "Save a squad before making transfers.",
      "toast.wrong_credentials": "Wrong email or password. Please try again.",
      "toast.signout_failed": "Sign out failed",
      "toast.squad_saved": "Squad saved for Round {0}.",
      "toast.could_not_save": "Could not save squad.",
      "toast.transfers_discarded": "Transfer changes discarded.",
      "toast.changes_reverted": "Changes reverted.",
      "toast.no_transfers_left": "No transfers left this round.",
      "toast.only_n_transfers": "Only {0} transfer(s) left this round.",
      "toast.transfer_rejected": "Transfer rejected \u2014 {0}",
      "toast.transfers_confirmed_mixed": "{0} transfer(s) confirmed; {1} rejected ({2}).",
      "toast.transfers_confirmed": "{0} transfer(s) confirmed.",
      "toast.rejected": "rejected",
      "toast.data_updated": "Data updated: {0} stats added, {1} matches refreshed.",
      "toast.could_not_update": "Could not update data.",
      "toast.removed_player": "Removed {0}.",
      "toast.player_promoted": "{0} added to starting XI.",
      "toast.backend_offline": "Backend offline — showing demo data.",

      /* ── Data update ── */
      "update.updating": "Updating",
      "update.fetching": "Fetching latest scores...",
      "update.player_stats": "Updating player stats...",
      "update.squad_analytics": "Refreshing squad analytics...",
      "update.complete": "Data update complete",
      "update.failed": "Update failed",
      "update.data": "Update Data",


      /* ── Transfer window ── */
      "window.open": "Transfers open",
      "window.locked": "Transfers locked",

      /* ── Override overlay ── */
      "override.label": "ADMIN GRANT",
      "override.title": "Time Warp Activated",
      "override.body": "The admin has granted you temporary access to make transfers on the most recent matchday. You can now go back and edit your squad. This access will be revoked once the admin disables it.",
      "override.dismiss": "Got it",
      "override.close": "Close",
      "override.toast": "Admin override active — you can edit past matchdays",

      /* ── Points ── */
      "points.pts": "{0} pts",

      /* ── Rule alerts ── */
      "rule.over_budget": "Over budget",
      "rule.over_budget_detail": "You do not have enough remaining budget to afford this player.",
      "rule.squad_full": "Squad full (11)",
      "rule.squad_full_detail": "Remove a player from the pitch before adding someone new.",
      "rule.already_in": "Already in squad",
      "rule.already_in_detail": "This player is already in your squad.",
      "rule.max_team": "Max {0} from one team",
      "rule.max_team_detail": "You can only have {0} players from the same national team.",
      "rule.no_slot": "No {0} slot left",

      /* ── Squad messages ── */
      "squad.window_open": "Window open",
      "squad.window_locked": "Window locked",
      "squad.undo": "Undo",
      "squad.benched": "Bench",
      "squad.promote": "Add {0} to starting XI",
      "squad.bench_tip": "{0} player(s) on the bench — switch formation or promote them back.",
      "squad.remove_captain": "Remove Captain",
      "squad.make_captain": "Make Captain",
      "squad.transfers_current_next": "Transfers are only allowed for the current and next matchday.",
      "squad.transfers_locked_md": "Transfers are locked once this matchday opens.",
      "squad.no_transfers_remain": "No transfers remain for this matchday.",
      "squad.read_only": "Saved squad is read-only until you enter transfer mode.",
      "squad.stage_swap": "Stage at least one swap before confirming.",
      "squad.only_n_remain": "Only {0} transfers remain this matchday.",
      "squad.keep_complete": "Keep the squad complete before confirming transfers.",
      "squad.budget_under_limit": "Budget must be back under the limit before confirmation.",
      "squad.confirm_one_by_one": "Transfers confirm one by one against the backend.",
      "squad.fill_slots": "Fill the remaining slots before saving.",
      "squad.select_captain": "Select a captain before saving.",
      "squad.budget_under_50": "Budget must be under $50.0m before saving.",
      "squad.backend_validation": "Backend validation still runs when you save.",
      "squad.tap_make_transfers": "Tap 'Make Transfers' to edit this squad.",
      "squad.tap_empty": "Welcome! Tap an empty position on the pitch to filter the player pool and start building.",
      "squad.good_progress": "Good progress \u2014 {0}/11 players selected. Keep going!",
      "squad.over_budget_tip": "You're over budget. Remove a player or swap for a cheaper one.",
      "squad.ready_to_save": "Your squad is ready! Hit Save to lock it in.",
      "squad.budget_under_50_confirm": "Budget must be under $50m before confirming.",
      "squad.remove_then_add": "Remove a player from the pitch, then add a replacement from the pool.",
      "squad.swaps_staged": "{0} swap(s) staged. Hit Confirm when ready.",
      "squad.dismiss_tip": "Dismiss tip",
      "squad.transfers_left": "{0}/5 transfers left",
      "squad.over_budget_short": "Over budget",
      "squad.add_position": "Add {0}",
      "squad.remove_team": "Remove {0}",
      "squad.aria_locked": "{0} \u2014 locked, tap Make Transfers to edit",
      "squad.aria_in_squad": "{0} \u2014 already in squad",
      "squad.aria_blocked": "{0} \u2014 {1}",
      "squad.aria_add": "{0} \u2014 add to squad",
      "squad.aria_add_btn": "Add {0}",

      /* ── Sort labels ── */
      "sort.default": "Default",
      "sort.price_desc": "Price - high to low",
      "sort.price_asc": "Price - low to high",
      "sort.name": "Name - A to Z",

      /* ── Tour: build steps ── */
      "tour.build_xi.title": "Build your XI",
      "tour.build_xi.body": "This is your pitch. You need 11 players in a 4-3-3 or 4-4-2 shape. Tap any empty slot to filter the pool by position.",
      "tour.pick_players.title": "Pick your players",
      "tour.pick_players.body": "Browse and filter players here. Click the + button on any row to add them to your squad.",
      "tour.choose_captain.title": "Choose your captain",
      "tour.choose_captain.body": "Click any player on the pitch to make them captain. The captain's points are doubled <span class='tour-x2-badge'>x2</span> \u2014 pick your star scorer wisely.",
      "tour.watch_budget.title": "Watch the budget",
      "tour.watch_budget.body": "You have $50m to spend. This meter tracks how much you've used and what's left.",
      "tour.choose_shape.title": "Choose your shape",
      "tour.choose_shape.body": "Switch between 4-3-3 and 4-4-2. Your formation determines how many players you need at each position.",
      "tour.how_points.title": "How points work",
      "tour.how_points.body": "Tap this icon anytime to see how fantasy points are calculated for each position - goals, assists, clean sheets, cards.",
      "tour.save_ready.title": "Save when ready",
      "tour.save_ready.body": "Once you've filled all 11 slots and stayed under budget, hit Save to lock in your squad.",

      /* ── Tour: transfer steps ── */
      "tour.make_transfers.title": "Make transfers",
      "tour.make_transfers.body": "Your saved squad is locked. Click here to enter transfer mode and swap players.",
      "tour.remove_player.title": "Remove a player",
      "tour.remove_player.body": "Click the x on any player token to remove them from your squad. This frees up a slot and budget.",
      "tour.add_replacement.title": "Add a replacement",
      "tour.add_replacement.body": "Pick a new player from the pool. They must fit the same position slot and stay within budget.",
      "tour.confirm_transfers.title": "Confirm transfers",
      "tour.confirm_transfers.body": "When your swaps are ready, click Confirm. Each transfer is sent to the backend individually. You get 5 per matchday.",

      /* ── Tour nav ── */
      "tour.back": "Back",
      "tour.skip": "Skip tour",
      "tour.finish": "Finish",
      "tour.next": "Next",

      /* ── How to score ── */
      "hts.appearance": "Appearance",
      "hts.up_to_60": "up to 60 mins",
      "hts.60_plus": "60+ minutes",
      "hts.assist": "Assist",
      "hts.yellow": "Yellow Card",
      "hts.red": "Red Card",
      "hts.goal_scored": "Goal Scored",
      "hts.clean_sheet": "Clean Sheet",
      "hts.saves": "Saves",
      "hts.penalty_save": "Penalty Save",
      "hts.own_goals": "Own Goals",
      "hts.shots_on_target": "Shots On Target",
      "hts.fouls_committed": "Fouls Committed",
      "hts.offsides": "Offsides",
      "hts.goals_conceded": "Goals Conceded",
      "hts.gk_only": "GK only",
      "hts.gk_def_only": "GK & DEF only",
      "hts.fwd_mid_only": "FWD & MID only",
      "hts.note_all": "Applies to every player, whatever their position.",
      "hts.note_gkdef": "Goalkeepers and defenders also earn clean-sheet points, +1 per save (GK), +8 per penalty save (GK), and score +7 for goals. See All Players for shared points.",
      "hts.note_midfwd": "Midfielders and forwards score +5 for goals and +1 per shot on target. See All Players for shared points.",
      "hts.note_deductions": "All deductions apply to every player unless noted otherwise.",

      /* ── Game rules ── */
      "rules.budget_cap": "Budget cap",
      "rules.budget_cap_text": "Build your squad within a $50M budget.",
      "rules.squad_size": "Squad size",
      "rules.squad_size_text": "Exactly 11 players per round.",
      "rules.formations": "Formations",
      "rules.formations_text": "Choose 4-3-3 or 4-4-2 each round.",
      "rules.team_limit": "National team limit",
      "rules.team_limit_text": "Starts at 3 players per nation, scaling up as teams are eliminated: 4 in R16, 5 in QF, 6 in SF, 8 in the Final.",
      "rules.transfers": "Transfers",
      "rules.transfers_text": "Max 5 transfers per matchday.",
      "rules.transfer_lock": "Transfer lock",
      "rules.transfer_lock_text": "Transfers lock 1 hour before the first kickoff of each round. Your squad is frozen until the next window opens.",
      "rules.captain": "Captain",
      "rules.captain_text": "Your captain earns double points for the round.",
      "rules.carryover": "Squad carryover",
      "rules.carryover_text": "If you don't make changes, your squad carries over to the next round.",
      "rules.tiebreaker": "Tiebreaker",
      "rules.tiebreaker_text": "If scores are tied: fewer transfers ranks higher, then earlier squad submission breaks the tie.",

      /* ── Nation limit scaling ── */
      "nation_scale.label": "PLAYERS PER NATION BY STAGE",
      "nation_scale.gs_r32": "GS + R32",
      "nation_scale.r16": "R16",
      "nation_scale.qf": "QF",
      "nation_scale.sf": "SF",
      "nation_scale.final": "Final",

      /* ── Charts ── */
      "chart.no_matches": "No matches played yet.",
      "chart.no_captain": "No captain data yet.",
      "chart.no_composition": "No composition data yet.",
      "chart.no_rank": "No rank data yet.",
      "chart.no_data_md": "No data for this matchday.",
      "chart.no_data": "No data yet.",
      "chart.goals": "Goals",
      "chart.assists": "Assists",
      "chart.clean_sheets": "Clean sheets",
      "chart.minutes": "Minutes",
      "chart.cards": "Cards",
      "chart.saves": "Saves",
      "chart.shots_on_target": "Shots on target",
      "chart.own_goals": "Own goals",
      "chart.fouls": "Fouls",
      "chart.offsides": "Offsides",
      "chart.goals_conceded": "Goals conceded",

      /* ── Progress quips ── */
      "progress.quip_1": "Consulting the VAR…",
      "progress.quip_2": "Tactical briefing in progress…",
      "progress.quip_3": "Checking the offsides…",
      "progress.quip_4": "Warming up the subs…",
      "progress.quip_5": "Reading the referee's mind…",
      "progress.quip_6": "Measuring the grass length…",
      "progress.quip_7": "Inflating the match ball…",
      "progress.quip_8": "Drawing set-piece routines…",
      "progress.quip_9": "Scouting the opposition…",
      "progress.quip_10": "Adjusting the shin pads…",
      "progress.quip_11": "Polishing the trophy…",
      "progress.quip_12": "Checking the net for holes…",

      /* ── Account screen ── */
      "nav.account": "Account",
      "topbar.account_eyebrow": "SETTINGS",
      "topbar.account_title": "Your account",
      "account.display_name": "Display name",
      "account.display_name_placeholder": "2-30 characters",
      "account.save": "Save",
      "account.account_info": "Account Info",
      "account.username": "Username",
      "account.email": "Email",
      "account.role": "Role",
      "account.user_id": "User ID",
      "account.role_admin": "Admin",
      "account.role_user": "User",
      "account.logout": "Log Out",
      "account.name_saved": "Display name updated.",
      "account.name_invalid": "Display name must be 2-30 characters.",
      "account.save_failed": "Could not save display name.",
      "account.load_failed": "Could not load account info.",

      /* ── Misc ── */
      "misc.skip_content": "Skip to content",
    },

    vi: {
      /* ── Login screen ── */
      "login.welcome_back": "Chào mừng trở lại",
      "login.subtitle": "Đăng nhập để quản lý đội hình fantasy và theo dõi hành trình World Cup",
      "login.display_name": "Tên hiển thị",
      "login.display_name_placeholder": "2-30 ký tự",
      "login.email_or_username": "Email hoặc tên người dùng",
      "login.email": "Email",
      "login.enter_email_or_username": "Nhập email hoặc tên người dùng",
      "login.enter_email": "Nhập email của bạn",
      "login.password": "Mật khẩu",
      "login.show_password": "Hiện mật khẩu",
      "login.hide_password": "Ẩn mật khẩu",
      "login.remember_me": "Ghi nhớ tôi",
      "login.forgot_password": "Quên mật khẩu?",
      "login.log_in": "Đăng nhập",
      "login.sign_up": "Đăng ký",
      "login.sign_in_google": "Đăng nhập bằng Google",
      "login.sign_up_google": "Đăng ký bằng Google",
      "login.or": "Hoặc",
      "login.dont_have_account": "Chưa có tài khoản?",
      "login.already_have_account": "Đã có tài khoản?",
      "login.remember_password": "Nhớ mật khẩu?",
      "login.create_account": "Tạo tài khoản",
      "login.reset_password": "Đặt lại mật khẩu",
      "login.reset_subtitle": "Nhập email và chúng tôi sẽ gửi link đặt lại mật khẩu",
      "login.send_reset_link": "Gửi link đặt lại",

      /* ── Auth overlay ── */
      "auth.check_email": "Kiểm tra email",
      "auth.confirmation_sent": "Chúng tôi đã gửi link xác nhận đến",
      "auth.click_to_activate": "Nhấp vào link để kích hoạt tài khoản.",
      "auth.reset_sent": "Đã gửi link đặt lại",
      "auth.reset_link_sent": "Chúng tôi đã gửi link đặt lại mật khẩu đến",
      "auth.check_inbox": "Kiểm tra hộp thư và làm theo link để đặt lại mật khẩu.",
      "auth.back_to_login": "Quay lại đăng nhập",

      /* ── Username modal ── */
      "username.choose": "Chọn tên hiển thị",
      "username.subtitle": "Chọn tên cho giải fantasy.",
      "username.placeholder": "2-30 ký tự",
      "username.choose_btn": "Chọn tên hiển thị",
      "username.available": "Khả dụng",
      "username.taken": "Đã được dùng",
      "username.invalid": "Tên hiển thị phải từ 2-30 ký tự.",
      "username.could_not_set": "Không thể đặt tên hiển thị.",
      "username.profile_completed": "H\u1ed3 s\u01a1 \u0111\u00e3 ho\u00e0n t\u1ea5t.",

      /* ── Sidebar ── */
      "nav.menu": "MENU",
      "nav.squad": "Đội hình",
      "nav.fixtures": "Lịch thi đấu",
      "nav.dashboard": "Bảng điều khiển",
      "nav.top_stats": "Thống kê",
      "nav.leaderboard": "Xếp hạng",
      "nav.sign_out": "Đăng xuất",
      "nav.toggle_menu": "Mở menu",
      "nav.gaffer_home": "Gaffer trang chủ",
      "nav.open_onboarding": "Mở hướng dẫn",

      /* ── Sidebar footer ── */
      "sidebar.deadline": "HẠN CHÓT",
      "sidebar.open": "MỞ",
      "sidebar.update_data": "Cập nhật dữ liệu",
      "sidebar.update_subtitle": "Đồng bộ thống kê trận đấu",
      "sidebar.update_tooltip": "Tải thống kê trận đấu từ ESPN",
      "sidebar.manager": "Huấn luyện viên",

      /* ── Topbar ── */
      "topbar.team_eyebrow": "QUẢN LÝ ĐỘI HÌNH",
      "topbar.team_title": "Lập đội hình vòng đấu",
      "topbar.fixtures_eyebrow": "GIẢI ĐẤU",
      "topbar.fixtures_title": "Lịch đấu & bảng xếp hạng",
      "topbar.scores_eyebrow": "HIỆU SUẤT",
      "topbar.scores_title": "Bảng điều khiển mùa giải",
      "topbar.stats_eyebrow": "GIẢI ĐẤU",
      "topbar.stats_title": "Thống kê cầu thủ",
      "topbar.leaderboard_eyebrow": "CUỘC ĐUA",
      "topbar.leaderboard_title": "Bảng xếp hạng toàn cầu",
      "topbar.total_points": "Tổng điểm",
      "topbar.switch_dark": "Chuyển sang chế độ tối",
      "topbar.switch_light": "Chuyển sang chế độ sáng",
      "topbar.replay_tour": "Phát lại hướng dẫn",
      "topbar.how_points": "Cách tính điểm",
      "nav.prev_round": "Vòng trước",
      "nav.next_round": "Vòng tiếp theo",
      "nav.aria_matchday": "Vòng đấu",
      "nav.aria_squad": "Đội hình",
      "nav.aria_squad_sections": "Phần đội hình",
      "nav.aria_squad_pitch": "Sân đội hình",
      "nav.aria_fixtures": "Lịch đấu",
      "nav.aria_dashboard": "Bảng điều khiển",
      "nav.aria_top_stats": "Thống kê",
      "nav.aria_leaderboard": "Bảng xếp hạng",
      "nav.aria_player_pool": "Danh sách cầu thủ",
      "nav.aria_right_panel": "Bảng phải",
      "nav.aria_fixture_views": "Chế độ xem lịch đấu",
      "nav.aria_scoring_by_position": "Tính điểm theo vị trí",

      /* ── Matchday desk ── */
      "desk.label": "BÀN ĐẤU HẠNG",
      "desk.build": "Xây dựng",
      "desk.live_points": "Điểm vòng đấu trực tiếp",
      "desk.captain_x2": "ĐỘI TRƯỞNG X2",
      "captain.not_selected": "Chưa chọn",
      "desk.auto_pick": "Tự chọn",
      "desk.matchday": "VÒNG ĐẤU",

      /* ── Squad summary ── */
      "summary.label": "TÓM TẮT ĐỘI HÌNH",
      "summary.players": "Cầu thủ",
      "summary.formation": "Sơ đồ",
      "summary.budget_used": "Ngân sách đã dùng",
      "summary.remaining": "Còn lại",
      "summary.transfers": "Chuyển nhượng",
      "summary.pressure": "Áp lực",

      /* ── Actions ── */
      "action.save_squad": "Lưu đội hình",
      "action.make_transfers": "Thay đổi đội hình",
      "action.confirm": "Xác nhận",
      "action.cancel": "Hủy",

      /* ── Mobile tabs ── */
      "tab.pitch": "Sân cỏ",
      "tab.players": "Cầu thủ",
      "tab.summary": "Tóm tắt",

      /* ── Pitch ── */
      "pitch.your_xi": "ĐỘI HÌNH CỦA BẠN",
      "pitch.your_xi_round": "ĐỘI HÌNH CỦA BẠN — {0} ({1})",
      "pitch.tap_to_start": "Chạm vào ô trống để bắt đầu",
      "pitch.tap_player": "Chạm vào cầu thủ để xem tùy chọn",
      "pitch.add_a": "Thêm {0}",
      "pitch.remove": "Bỏ {0}",
      "date.locale": "vi-VN",
      "lb.captain_picks_title": "Lượt chọn đội trưởng: {0}",

      /* ── Player pool ── */
      "pool.label": "DANH SÁCH CẦU THỦ",
      "pool.how_to_score": "Cách tính điểm",
      "pool.search": "Tìm kiếm",
      "pool.search_players": "Tìm cầu thủ",
      "pool.all": "Tất cả",
      "pool.teams": "Đội tuyển",
      "pool.filter_teams": "Lọc đội tuyển",
      "pool.price_range": "Khoảng giá",
      "pool.any": "Tất cả",
      "pool.sort": "Sắp xếp",
      "pool.load_more": "Tải thêm",
      "pool.no_match": "Không có cầu thủ phù hợp với bộ lọc.",
      "pool.no_teams": "Không có đội phù hợp.",
      "pool.showing": "Hiển thị {0} / {1}",
      "pool.player_count": "{0} cầu thủ",
      "pool.player_count_plural": "{0} cầu thủ",

      /* ── Pool badges ── */
      "badge.in_squad": "\u2713 Trong đội",
      "badge.over_budget": "Trên $50m",
      "badge.squad_full": "Đội đầy",
      "badge.max_3": "Tối đa 3",
      "badge.slot_full": "Đã đủ vị trí",
      "badge.locked": "Đã khóa",

      /* ── Score tabs ── */
      "score.all_players": "Tất cả cầu thủ",
      "score.gk_def": "Thủ môn & Hậu vệ",
      "score.mid_fwd": "Tiền vệ & Tiền đạo",
      "score.deductions": "Khoản trừ",

      /* ── Fixtures ── */
      "fixtures.table": "Bảng & Lịch đấu",
      "fixtures.bracket": "Cây đấu loại trực tiếp",
      "fixtures.fifa": "FIFA World Cup",
      "fixtures.subtitle": "Bảng đấu, lịch thi đấu và sơ đồ loại trực tiếp.",
      "fixtures.matches": "Trận đấu",
      "fixtures.stage": "Giai đoạn",
      "fixtures.times_local": "GIỜ THEO GIỜ ĐỊA PHƯƠNG",
      "fixtures.no_group_data": "Chưa có dữ liệu bảng đấu.",
      "fixtures.no_fixtures": "Chưa có lịch đấu cho vòng này.",
      "fixtures.tbd": "Chưa xác định",
      "fixtures.champion": "NHÀ VÔ ĐỊCH",
      "fixtures.group": "Bảng {0}",
      "fixtures.col_team": "Đội",
      "fixtures.col_pl": "T",
      "fixtures.col_w": "Th",
      "fixtures.col_d": "H",
      "fixtures.col_l": "B",
      "fixtures.col_gd": "HS",
      "fixtures.col_pts": "Đ",
      "fixtures.col_form": "Phong độ",
      "fixtures.col_next": "Tiếp",

      /* ── Knockout round names ── */
      "ko.round_of_32": "VÒNG 1/32",
      "ko.round_of_16": "VÒNG 1/16",
      "ko.quarterfinals": "TỨ KẾT",
      "ko.semifinals": "BÁN KẾT",
      "ko.final": "CHUNG KẾT",

      /* ── Dashboard ── */
      "dash.matchday": "Vòng đấu",
      "dash.section_overview": "Tổng quan",
      "dash.section_squad": "Phân tích đội hình",
      "dash.section_breakdown": "Chi tiết",
      "dash.total_points": "TỔNG ĐIỂM",
      "dash.live_squad": "Đội hình trực tiếp",
      "dash.in_bank": "Trong ngân quỹ",
      "dash.active_squad": "Đội hình hiện tại",
      "dash.score_composition": "Cấu thành điểm số",
      "dash.where_points": "Điểm đến từ đâu",
      "dash.adds": "Cộng điểm",
      "dash.deductions": "Trừ điểm",
      "dash.captain_impact": "Tác động đội trưởng",
      "dash.captain_vs_avg": "Đội trưởng x2 vs TB đội",
      "dash.rank_trajectory": "Diễn biến thứ hạng",
      "dash.your_position": "Vị trí của bạn qua các vòng",
      "dash.top_scorers": "Vua phá lưới",
      "dash.value_for_money": "Đáng đồng tiền bát gạo",
      "dash.price_vs_points": "Giá vs điểm",
      "dash.efficiency": "Hiệu suất",
      "dash.points_per_m": "Điểm mỗi $m",
      "dash.position_contribution": "Đóng góp theo vị trí",
      "dash.transfer_history": "Lịch sử chuyển nhượng",
      "dash.click_to_expand": "Nhấp vòng đấu để mở rộng",
      "dash.no_player_data": "Không có dữ liệu cầu thủ cho vòng này.",
      "dash.no_data_md": "Không có dữ liệu cho vòng này.",
      "dash.no_transfers": "Chưa có chuyển nhượng nào.",
      "dash.no_data": "Không có dữ liệu",
      "dash.player_breakdown": "Chi tiết cầu thủ",
      "dash.stat_by_stat": "Phân tích từng chỉ số",
      "dash.dnp": "Không ra sân",
      "dash.captain_x2": "Đội trưởng x2",
      "dash.total": "Tổng",
      "dash.vs_league": "Bạn vs trung bình giải",
      "dash.your_score_vs_avg": "Tổng điểm của bạn so với trung bình giải",
      "dash.matchday_insights": "Điểm nổi bật trận đấu",
      "dash.mvp": "MVP",
      "dash.flop": "Thất vọng",
      "dash.transfer_impact": "Tác động chuyển nhượng",
      "dash.net_from_transfers": "từ {0} chuyển nhượng",
      "dash.transfer_count": "{0} chuyển nhượng",
      "dash.transfer_count_plural": "{0} chuyển nhượng",
      "dash.out": "RA",
      "dash.in": "VÀO",
      "dash.even": "cân bằng",
      "dash.unknown": "Không rõ",
      "dash.pts_per_m": "điểm/$m",

      /* ── Stats ── */
      "stats.fantasy_points": "Điểm fantasy",
      "stats.top_scorers": "Vua phá lưới",
      "stats.assists": "Kiến tạo",
      "stats.goal_involvements": "Đóng góp bàn thắng",
      "stats.clean_sheets": "Không thủng lưới",
      "stats.most_cards": "Nhiều Thẻ Nhất",
      "stats.top_saves": "Cứu Thua Nhiều Nhất",
      "stats.top_penalty_saves": "Cứu Penalty",
      "stats.hint_psv": "Cứu Penalty",
      "stats.hint_total": "Tổng",
      "stats.hint_saves": "Cứu thua",
      "stats.hint_goals": "Bàn thắng",
      "stats.hint_assists": "Kiến tạo",
      "stats.hint_ga": "Bàn + Kiến tạo",
      "stats.hint_def_gk": "HẬU VỆ / THU MÔN",
      "stats.hint_yr": "Vàng + Đỏ",
      "stats.no_data": "Chưa có dữ liệu.",
      "stats.failed": "Tải thống kê thất bại.",
      "stats.pts": "điểm",

      /* ── Leaderboard ── */
      "lb.standings": "BẢNG XẾP HẠNG",
      "lb.title": "Bảng xếp hạng",
      "lb.subtitle": "Xem bạn đang đứng đâu so với các huấn luyện viên khác.",
      "lb.overall": "Tổng hợp",
      "lb.by_matchday": "Theo vòng đấu",
      "lb.popular": "Lựa chọn phổ biến",
      "lb.leader": "Dẫn đầu",
      "lb.you": "Bạn",
      "lb.admin": "Quản trị",
      "lb.managers": "Huấn luyện viên",
      "lb.rank": "Hạng",
      "lb.manager": "Huấn luyện viên",
      "lb.pts": "Điểm",
      "lb.delta": "Thay đổi",
      "lb.before_ko": "Trước Kickoff",
      "lb.none": "Trống",
      "lb.unranked": "Chưa xếp hạng",
      "lb.no_data_md": "Chưa có dữ liệu xếp hạng cho vòng này.",
      "lb.no_data": "Chưa có dữ liệu xếp hạng.",
      "lb.no_popular": "Chưa có dữ liệu lựa chọn phổ biến cho vòng này.",
      "lb.pick_rate": "Tỷ lệ chọn",
      "lb.picks": "lượt chọn",
      "lb.captain_s": "đội trưởng",
      "lb.captain_p": "đội trưởng",
      "lb.manager_n": "HLV {0}",

      /* ── Welcome overlay ── */
      "welcome.label": "PHÒNG ĐIỀU KHIỂN GAFFER",
      "welcome.title": "Thiết lập bàn đấu hạng",
      "welcome.lede": "Lập đội hình 11 người, nằm trong ngân sách, theo dõi tình trạng giải và xác nhận chuyển nhượng chỉ khi cửa sổ mở.",
      "welcome.choose_shape": "Chọn sơ đồ",
      "welcome.shape_desc": "Chuyển đổi giữa 4-3-3 và 4-4-2.",
      "welcome.respect_rules": "Tuân thủ luật lệ",
      "welcome.rules_desc": "11 cầu thủ, tối đa 3 mỗi đội (tăng ở vòng knock-out), ngân sách $50.0m.",
      "welcome.add_players": "Thêm cầu thủ",
      "welcome.add_desc": "Lọc danh sách theo vị trí, đội hoặc giá. Nhấn + để thêm.",
      "welcome.track": "Theo dõi mọi thứ",
      "welcome.track_desc": "Lịch đấu, bảng xếp hạng, thống kê và bảng điều khiển luôn cập nhật.",
      "welcome.show_me": "Chỉ tôi cách",
      "welcome.got_it": "Đã hiểu",

      /* ── Score overlay ── */
      "score_overlay.label": "HỆ THỐNG TÍNH ĐIỂM",
      "score_overlay.title": "Cách Tính Điểm",
      "score_overlay.close": "Đóng hướng dẫn tính điểm",
      "score_overlay.game_rules": "Luật chơi",
      "score_overlay.prize_pool": "GIẢI THƯỞNG",
      "score_overlay.1st": "Hạng 1",
      "score_overlay.2nd": "Hạng 2",
      "score_overlay.3rd": "Hạng 3",

      /* ── Transfer warning ── */
      "warning.label": "THAY ĐỔI CHƯA LƯU",
      "warning.title": "Bạn có thay đổi chưa lưu",
      "warning.body_squad": "Bạn có thay đổi đội hình chưa lưu sẽ bị mất nếu rời đi. Lưu đội hình hoặc ở lại để tiếp tục chỉnh sửa.",
      "warning.body_transfers": "Bạn có chuyển nhượng chưa lưu sẽ bị mất nếu rời đi. Xác nhận chuyển nhượng hoặc hủy để tiếp tục chỉnh sửa.",
      "warning.body_input": "Bạn có văn bản chưa lưu trong ô tìm kiếm hoặc biểu mẫu sẽ bị mất nếu rời đi hoặc tải lại trang.",
      "warning.stay": "Ở lại chỉnh sửa",
      "warning.leave": "Vẫn rời đi",
      "warning.pending_transfers": "Bạn có thay đổi chuyển nhượng đang chờ",

      /* ── Stage labels ── */
      "stage.group_stage": "Vòng {0}",
      "stage.round_of_32": "Vòng 1/32",
      "stage.round_of_16": "Vòng 1/16",
      "stage.quarter_final": "Tứ kết",
      "stage.semi_final": "Bán kết",
      "stage.final": "Chung kết",
      "stage.group_stage_plain": "Vòng bảng",

      /* ── Toasts & messages ── */
      "toast.session_expired": "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.",
      "toast.no_permission": "Bạn không có quyền thực hiện thao tác này.",
      "toast.google_failed": "Đăng nhập Google thất bại",
      "toast.auth_failed": "Xác thực thất bại",
      "toast.load_failed": "Không thể tải dữ liệu. Vui lòng thử lại.",
      "toast.verify_failed": "Không thể xác minh phiên đăng nhập. Vui lòng đăng nhập lại.",
      "toast.save_before_transfers": "Lưu đội hình trước khi chuyển nhượng.",
      "toast.wrong_credentials": "Sai email hoặc mật khẩu. Vui lòng thử lại.",
      "toast.signout_failed": "Đăng xuất thất bại",
      "toast.squad_saved": "Đội hình đã lưu cho Vòng {0}.",
      "toast.could_not_save": "Không thể lưu đội hình.",
      "toast.transfers_discarded": "Thay đổi chuyển nhượng đã hủy.",
      "toast.changes_reverted": "Thay đổi đã hoàn tác.",
      "toast.no_transfers_left": "Không còn lượt chuyển nhượng vòng này.",
      "toast.only_n_transfers": "Chỉ còn {0} lượt chuyển nhượng vòng này.",
      "toast.transfer_rejected": "Chuyển nhượng bị từ chối \u2014 {0}",
      "toast.transfers_confirmed_mixed": "{0} chuyển nhượng đã xác nhận; {1} bị từ chối ({2}).",
      "toast.transfers_confirmed": "{0} chuyển nhượng đã xác nhận.",
      "toast.rejected": "bị từ chối",
      "toast.data_updated": "Đã cập nhật: {0} thống kê mới, {1} trận đấu đã làm mới.",
      "toast.could_not_update": "Không thể cập nhật dữ liệu.",
      "toast.removed_player": "Đã bỏ {0}.",
      "toast.player_promoted": "{0} đã đưa vào đội hình xuất phát.",
      "toast.backend_offline": "Máy chủ ngoại tuyến — đang hiển thị dữ liệu demo.",

      /* ── Data update ── */
      "update.updating": "Đang cập nhật",
      "update.fetching": "Đang tải điểm số mới nhất...",
      "update.player_stats": "Đang cập nhật thống kê cầu thủ...",
      "update.squad_analytics": "Đang làm mới phân tích đội hình...",
      "update.complete": "Cập nhật dữ liệu hoàn tất",
      "update.failed": "Cập nhật thất bại",
      "update.data": "Cập nhật dữ liệu",


      /* ── Transfer window ── */
      "window.open": "Chuyển nhượng đã mở",
      "window.locked": "Chuyển nhượng đã khóa",

      /* ── Override overlay ── */
      "override.label": "CẤP QUYỀN ADMIN",
      "override.title": "Du hành thời gian",
      "override.body": "Admin đã cấp cho bạn quyền truy cập tạm thời để chuyển nhượng ở vòng gần nhất. Bạn có thể quay lại và chỉnh sửa đội hình. Quyền này sẽ bị thu hồi khi admin tắt.",
      "override.dismiss": "Đã hiểu",
      "override.close": "Đóng",
      "override.toast": "Admin override đang bật — bạn có thể chỉnh sửa các vòng đã qua",

      /* ── Points ── */
      "points.pts": "{0} điểm",

      /* ── Rule alerts ── */
      "rule.over_budget": "Vượt ngân sách",
      "rule.over_budget_detail": "Bạn không đủ ngân sách để mua cầu thủ này.",
      "rule.squad_full": "Đội đầy (11)",
      "rule.squad_full_detail": "Bỏ một cầu thủ khỏi sân trước khi thêm người mới.",
      "rule.already_in": "Đã có trong đội",
      "rule.already_in_detail": "Cầu thủ này đã có trong đội hình của bạn.",
      "rule.max_team": "Tối đa {0} từ một đội",
      "rule.max_team_detail": "Bạn chỉ được giữ {0} cầu thủ từ cùng một đội tuyển.",
      "rule.no_slot": "Không còn vị trí {0}",

      /* ── Squad messages ── */
      "squad.window_open": "Cửa sổ mở",
      "squad.window_locked": "Cửa sổ khóa",
      "squad.undo": "Hoàn tác",
      "squad.benched": "Dự bị",
      "squad.promote": "Đưa {0} vào đội hình xuất phát",
      "squad.bench_tip": "{0} cầu thủ trên ghế dự bị — đổi đội hình hoặc đưa họ trở lại.",
      "squad.remove_captain": "Bỏ đội trưởng",
      "squad.make_captain": "Chọn đội trưởng",
      "squad.transfers_current_next": "Chuyển nhượng chỉ được phép cho vòng đấu hiện tại và vòng tiếp theo.",
      "squad.transfers_locked_md": "Chuyển nhượng bị khóa khi vòng đấu này bắt đầu.",
      "squad.no_transfers_remain": "Không còn lượt chuyển nhượng cho vòng đấu này.",
      "squad.read_only": "Đội hình đã lưu chỉ đọc cho đến khi vào chế độ chuyển nhượng.",
      "squad.stage_swap": "Thực hiện ít nhất một thay đổi trước khi xác nhận.",
      "squad.only_n_remain": "Chỉ còn {0} lượt chuyển nhượng vòng đấu này.",
      "squad.keep_complete": "Đội hình phải đầy đủ trước khi xác nhận chuyển nhượng.",
      "squad.budget_under_limit": "Ngân sách phải dưới giới hạn trước khi xác nhận.",
      "squad.confirm_one_by_one": "Chuyển nhượng được xác nhận từng cái một với backend.",
      "squad.fill_slots": "Điền đầy đủ các vị trí trước khi lưu.",
      "squad.select_captain": "Chọn đội trưởng trước khi lưu.",
      "squad.budget_under_50": "Ngân sách phải dưới $50.0m trước khi lưu.",
      "squad.backend_validation": "Backend vẫn kiểm tra dữ liệu khi bạn lưu.",
      "squad.tap_make_transfers": "Nhấn 'Chuyển nhượng' để chỉnh sửa đội hình.",
      "squad.tap_empty": "Chào mừng! Chạm vào vị trí trống trên sân để lọc danh sách cầu thủ và bắt đầu xây dựng đội hình.",
      "squad.good_progress": "Tiến triển tốt \u2014 {0}/11 cầu thủ đã chọn. Cố lên!",
      "squad.over_budget_tip": "Bạn đã vượt ngân sách. Bỏ một cầu thủ hoặc đổi cầu thủ rẻ hơn.",
      "squad.ready_to_save": "Đội hình sẵn sàng! Nhấn Lưu để khóa đội hình.",
      "squad.budget_under_50_confirm": "Ngân sách phải dưới $50m trước khi xác nhận.",
      "squad.remove_then_add": "Bỏ một cầu thủ khỏi sân, rồi thêm cầu thủ thay thế từ danh sách.",
      "squad.swaps_staged": "{0} thay đổi đã chờ. Nhấn Xác nhận khi sẵn sàng.",
      "squad.dismiss_tip": "Bỏ qua mẹo",
      "squad.transfers_left": "{0}/5 lượt chuyển nhượng",
      "squad.over_budget_short": "Vượt ngân sách",
      "squad.add_position": "Thêm {0}",
      "squad.remove_team": "Bỏ {0}",
      "squad.aria_locked": "{0} \u2014 đã khóa, nhấn Chuyển nhượng để chỉnh sửa",
      "squad.aria_in_squad": "{0} \u2014 đã có trong đội",
      "squad.aria_blocked": "{0} \u2014 {1}",
      "squad.aria_add": "{0} \u2014 thêm vào đội hình",
      "squad.aria_add_btn": "Thêm {0}",

      /* ── Sort labels ── */
      "sort.default": "Mặc định",
      "sort.price_desc": "Giá - cao xuống thấp",
      "sort.price_asc": "Giá - thấp lên cao",
      "sort.name": "Tên - A đến Z",

      /* ── Tour: build steps ── */
      "tour.build_xi.title": "Lập đội hình XI",
      "tour.build_xi.body": "Đây là sân cỏ của bạn. Bạn cần 11 cầu thủ theo sơ đồ 4-3-3 hoặc 4-4-2. Chạm vào vị trí trống để lọc danh sách theo vị trí.",
      "tour.pick_players.title": "Chọn cầu thủ",
      "tour.pick_players.body": "Duyệt và lọc cầu thủ tại đây. Nhấn nút + trên bất kỳ hàng nào để thêm vào đội hình.",
      "tour.choose_captain.title": "Chọn đội trưởng",
      "tour.choose_captain.body": "Nhấn vào bất kỳ cầu thủ nào trên sân để chọn làm đội trưởng. Điểm của đội trưởng được nhân đôi <span class='tour-x2-badge'>x2</span> \u2014 chọn cầu thủ ghi bàn xuất sắc nhất.",
      "tour.watch_budget.title": "Theo dõi ngân sách",
      "tour.watch_budget.body": "Bạn có $50m để chi. Thanh này theo dõi số tiền đã dùng và còn lại.",
      "tour.choose_shape.title": "Chọn sơ đồ",
      "tour.choose_shape.body": "Chuyển đổi giữa 4-3-3 và 4-4-2. Sơ đồ quyết định số cầu thủ cần ở mỗi vị trí.",
      "tour.how_points.title": "Cách tính điểm",
      "tour.how_points.body": "Nhấn vào biểu tượng này bất cứ lúc nào để xem cách tính điểm fantasy cho mỗi vị trí - bàn thắng, kiến tạo, không thủng lưới, thẻ phạt.",
      "tour.save_ready.title": "Lưu khi sẵn sàng",
      "tour.save_ready.body": "Khi đã điền đủ 11 vị trí và nằm trong ngân sách, nhấn Lưu để khóa đội hình.",

      /* ── Tour: transfer steps ── */
      "tour.make_transfers.title": "Chuyển nhượng",
      "tour.make_transfers.body": "Đội hình đã lưu bị khóa. Nhấn vào đây để vào chế độ chuyển nhượng và đổi cầu thủ.",
      "tour.remove_player.title": "Bỏ một cầu thủ",
      "tour.remove_player.body": "Nhấn dấu x trên bất kỳ cầu thủ nào để bỏ khỏi đội hình. Việc này giải phóng vị trí và ngân sách.",
      "tour.add_replacement.title": "Thêm cầu thủ thay thế",
      "tour.add_replacement.body": "Chọn cầu thủ mới từ danh sách. Họ phải cùng vị trí và nằm trong ngân sách.",
      "tour.confirm_transfers.title": "Xác nhận chuyển nhượng",
      "tour.confirm_transfers.body": "Khi các thay đổi sẵn sàng, nhấn Xác nhận. Mỗi chuyển nhượng được gửi lên backend riêng lẻ. Bạn có 5 lượt mỗi vòng đấu.",

      /* ── Tour nav ── */
      "tour.back": "Quay lại",
      "tour.skip": "Bỏ qua hướng dẫn",
      "tour.finish": "Hoàn thành",
      "tour.next": "Tiếp theo",

      /* ── How to score ── */
      "hts.appearance": "Ra sân",
      "hts.up_to_60": "dưới 60 phút",
      "hts.60_plus": "trên 60 phút",
      "hts.assist": "Kiến tạo",
      "hts.yellow": "Thẻ Vàng",
      "hts.red": "Thẻ Đỏ",
      "hts.goal_scored": "Bàn Thắng",
      "hts.clean_sheet": "Không Thủng Lưới",
      "hts.saves": "Cứu Thua",
      "hts.penalty_save": "Cứu Penalty",
      "hts.own_goals": "Bàn Phản Lưới",
      "hts.shots_on_target": "Sút Trúng Đích",
      "hts.fouls_committed": "Phạm Lỗi",
      "hts.offsides": "Việt Vị",
      "hts.goals_conceded": "Bàn Thủng Lưới",
      "hts.gk_only": "Chỉ thủ môn",
      "hts.gk_def_only": "Thủ môn & Hậu vệ",
      "hts.fwd_mid_only": "Tiền vệ & Tiền đạo",
      "hts.note_all": "Áp dụng cho mọi cầu thủ, bất kể vị trí.",
      "hts.note_gkdef": "Thủ môn và hậu vệ cũng được điểm không thủng lưới, +1 mỗi cú cứu thua (TM), +8 mỗi cú cứu penalty (TM), và ghi +7 cho bàn thắng. Xem tab Tất cả cho điểm chung.",
      "hts.note_midfwd": "Tiền vệ và tiền đạo ghi +5 cho bàn thắng và +1 mỗi cú sút trúng đích. Xem tab Tất cả cho điểm chung.",
      "hts.note_deductions": "Mọi khoản trừ áp dụng cho mọi cầu thủ trừ khi có ghi chú khác.",

      /* ── Game rules ── */
      "rules.budget_cap": "Giới hạn ngân sách",
      "rules.budget_cap_text": "Lập đội hình trong ngân sách $50M.",
      "rules.squad_size": "Quy mô đội hình",
      "rules.squad_size_text": "Đúng 11 cầu thủ mỗi vòng.",
      "rules.formations": "Sơ đồ",
      "rules.formations_text": "Chọn 4-3-3 hoặc 4-4-2 mỗi vòng.",
      "rules.team_limit": "Giới hạn đội tuyển",
      "rules.team_limit_text": "Bắt đầu với 3 cầu thủ mỗi đội tuyển, tăng dần khi các đội bị loại: 4 ở vòng 16, 5 ở tứ kết, 6 ở bán kết, 8 ở chung kết.",
      "rules.transfers": "Chuyển nhượng",
      "rules.transfers_text": "Tối đa 5 chuyển nhượng mỗi vòng đấu.",
      "rules.transfer_lock": "Khóa chuyển nhượng",
      "rules.transfer_lock_text": "Chuyển nhượng bị khóa 1 giờ trước trận đầu tiên của mỗi vòng. Đội hình bị đóng băng cho đến khi cửa sổ tiếp theo mở.",
      "rules.captain": "Đội trưởng",
      "rules.captain_text": "Đội trưởng của bạn nhận nhân đôi điểm cho vòng đấu.",
      "rules.carryover": "Kế thừa đội hình",
      "rules.carryover_text": "Nếu không thay đổi, đội hình sẽ được giữ nguyên cho vòng tiếp theo.",
      "rules.tiebreaker": "Xếp hạng đồng điểm",
      "rules.tiebreaker_text": "Nếu bằng điểm: ít chuyển nhượng hơn xếp trên, rồi thời gian lưu đội hình sớm hơn được ưu tiên.",

      /* ── Nation limit scaling ── */
      "nation_scale.label": "SỐ CẦU THỦ MỖI ĐỘI THEO VÒNG",
      "nation_scale.gs_r32": "VS + R32",
      "nation_scale.r16": "R16",
      "nation_scale.qf": "Tứ kết",
      "nation_scale.sf": "Bán kết",
      "nation_scale.final": "Chung kết",

      /* ── Charts ── */
      "chart.no_matches": "Chưa có trận đấu nào.",
      "chart.no_captain": "Chưa có dữ liệu đội trưởng.",
      "chart.no_composition": "Chưa có dữ liệu cấu thành điểm.",
      "chart.no_rank": "Chưa có dữ liệu thứ hạng.",
      "chart.no_data_md": "Không có dữ liệu cho vòng này.",
      "chart.no_data": "Chưa có dữ liệu.",
      "chart.goals": "Bàn thắng",
      "chart.assists": "Kiến tạo",
      "chart.clean_sheets": "Không thủng lưới",
      "chart.minutes": "Phút thi đấu",
      "chart.cards": "Thẻ phạt",
      "chart.saves": "Cứu thua",
      "chart.shots_on_target": "Sút trúng đích",
      "chart.own_goals": "Bàn phản lưới",
      "chart.fouls": "Phạm lỗi",
      "chart.offsides": "Việt vị",
      "chart.goals_conceded": "Bàn thủng lưới",

      /* ── Progress quips ── */
      "progress.quip_1": "Đang xem VAR…",
      "progress.quip_2": "Đang phổ biến chiến thuật…",
      "progress.quip_3": "Đang kiểm tra việt vị…",
      "progress.quip_4": "Đang khởi động cầu thủ dự bị…",
      "progress.quip_5": "Đang đọc ý trọng tài…",
      "progress.quip_6": "Đang đo chiều dài cỏ…",
      "progress.quip_7": "Đang bơm bóng thi đấu…",
      "progress.quip_8": "Đang vẽ pha bóng cố định…",
      "progress.quip_9": "Đang do thám đối thủ…",
      "progress.quip_10": "Đang chỉnh ống bảo vệ ống chân…",
      "progress.quip_11": "Đang lau cúp vô địch…",
      "progress.quip_12": "Đang kiểm lưới xem có lỗ không…",

      /* ── Misc ── */
      "misc.skip_content": "Bỏ qua đến nội dung",

      /* ── Account screen ── */
      "nav.account": "Tài khoản",
      "topbar.account_eyebrow": "CÀI ĐẶT",
      "topbar.account_title": "Tài khoản của bạn",
      "account.display_name": "Tên hiển thị",
      "account.display_name_placeholder": "2-30 ký tự",
      "account.save": "Lưu",
      "account.account_info": "Thông tin tài khoản",
      "account.username": "Tên người dùng",
      "account.email": "Email",
      "account.role": "Vai trò",
      "account.user_id": "Mã người dùng",
      "account.role_admin": "Quản trị viên",
      "account.role_user": "Người dùng",
      "account.logout": "Đăng xuất",
      "account.name_saved": "Đã cập nhật tên hiển thị.",
      "account.name_invalid": "Tên hiển thị phải từ 2-30 ký tự.",
      "account.save_failed": "Không thể lưu tên hiển thị.",
      "account.load_failed": "Không thể tải thông tin tài khoản.",
    },
  };

  function init() {
    _lang = localStorage.getItem(STORAGE_KEY) || "en";
    document.documentElement.lang = _lang;
    applyI18n();
    initToggle();
  }

  function t(key) {
    var str = (dict[_lang] && dict[_lang][key]) || (dict.en && dict.en[key]) || key;
    if (arguments.length <= 1) return str;
    var args = Array.prototype.slice.call(arguments, 1);
    return str.replace(/\{(\d+)\}/g, function (m, i) {
      return args[i] != null ? args[i] : m;
    });
  }

  function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.dataset.i18n;
      var val = t(key);
      if (!val || val === key) return;
      if (el.children.length > 0) {
        var lastTextNode = null;
        el.childNodes.forEach(function (node) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            lastTextNode = node;
          }
        });
        if (lastTextNode) {
          lastTextNode.textContent = val;
        } else {
          el.appendChild(document.createTextNode(val));
        }
      } else {
        el.textContent = val;
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.dataset.i18nPlaceholder;
      var val = t(key);
      if (val && val !== key) el.placeholder = val;
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      var key = el.dataset.i18nAriaLabel;
      var val = t(key);
      if (val && val !== key) el.setAttribute("aria-label", val);
    });

    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var key = el.dataset.i18nTitle;
      var val = t(key);
      if (val && val !== key) el.setAttribute("title", val);
    });

    document.documentElement.lang = _lang;
  }

  function setLang(lang) {
    var root = document.documentElement;
    root.classList.add("lang-transitioning");
    setTimeout(function () {
      localStorage.setItem(STORAGE_KEY, lang);
      _lang = lang;
      document.documentElement.lang = _lang;
      applyI18n();
      initToggle();
      root.classList.remove("lang-transitioning");
      var event = new CustomEvent("lang-changed", { detail: { lang: _lang } });
      window.dispatchEvent(event);
    }, 120);
  }

  function getLang() {
    return _lang;
  }

  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  function initToggle() {
    var btns = document.querySelectorAll(".lang-toggle");
    btns.forEach(function (btn) {
      var isVi = _lang === "vi";
      btn.innerHTML = isVi
        ? '<span class="lang-toggle__flag" style="background-image:url(\'https://flagcdn.com/w40/gb.png\')"></span><span class="lang-toggle__code">English</span>'
        : '<span class="lang-toggle__flag" style="background-image:url(\'https://flagcdn.com/w40/vn.png\')"></span><span class="lang-toggle__code">Tiếng Việt</span>';
      btn.setAttribute("aria-label", isVi ? "Switch to English" : "Chuyển sang tiếng Việt");
      btn.setAttribute("title", isVi ? "Switch to English" : "Chuyển sang tiếng Việt");
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function () {
        setLang(_lang === "en" ? "vi" : "en");
      });
    });
  }

  return { init: init, t: t, setLang: setLang, getLang: getLang, applyI18n: applyI18n, escapeHtml: escapeHtml };
})();

window.t = I18n.t;
window.I18n = I18n;
window.escapeHtml = I18n.escapeHtml;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", I18n.init);
} else {
  I18n.init();
}
