# External data — populating the tables from ESPN's free API

This explains **where the real World Cup data comes from** and **how the loader scripts in
`tools/` work**. It is written to be read top-to-bottom by someone learning, so it spends a bit
of time on *how APIs work* before the project specifics.

---

## 1. The problem

The database starts empty. Before anyone can build a squad or see a score, four tables need
real data:

| Table        | What it holds                                                   |
| --------------| -----------------------------------------------------------------|
| `team`       | the 48 nations                                                  |
| `match`      | the 104 fixtures (who plays who, when, what stage, scores)      |
| `player`     | every nation's squad                                            |
| `playerstat` | per-player, per-match numbers (goals, assists, minutes, cards…) |

We needed a **free** source for all of this. Paid APIs (Sportmonks, BALLDONTLIE, API-Football)
all lock per-player match stats behind a paywall. FotMob is free but requires a fragile signed
header (`x-fm-req`) and is really web-scraping. The winner was **ESPN's unofficial public API**.

---

## 2. What an API actually is (the mental model)

When you open a normal web page, the server sends back **HTML** — designed for human eyes,
full of layout and styling. When you call an **API**, the server sends back **JSON** — the same
underlying data, but structured for a *program* to read.

JSON looks like a wall of text in the browser, but it is not meant to be read like prose. It is
organised into **keys and values**, like nested labelled boxes:

```json
{
  "events": [
    { "id": "760419", "name": "Morocco vs Brazil", "date": "2026-06-13T19:00Z" },
    { "id": "760418", "name": "Scotland vs Haiti",  "date": "2026-06-13T16:00Z" }
  ]
}
```

A program never "reads" the whole blob. It jumps straight to the key it wants — like going
straight to "S → Smith" in a phone book instead of reading every name:

```python
data = response.json()      # the whole blob becomes a Python dict
events = data["events"]     # jump to the list of events
first_id = events[0]["id"]  # -> "760419"   (instant, no matter how big the blob is)
```

That is the whole point of an API: predictable structured data a program can reliably pluck
exact values out of, every single time.

---

## 3. ESPN's API — the pattern

ESPN never published this API, but it's public and needs **no key and no login**. Every soccer
endpoint is the same base URL with the World Cup league code `fifa.world`, then a resource:

```
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/<resource>
```

Swap the last part:

| Resource                     | Returns                                                 | Fills        |
| ------------------------------| ---------------------------------------------------------| --------------|
| `/teams`                     | all 48 teams (id, abbreviation, name)                   | `team`       |
| `/teams/{teamId}/roster`     | one nation's squad (player id, name, position)          | `player`     |
| `/scoreboard?dates=YYYYMMDD` | the fixtures on a date (event ids, teams, score, stage) | `match`      |
| `/summary?event={eventId}`   | one match's per-player stats                            | `playerstat` |

You can paste any of these into a browser right now and see the JSON.

### How you know which match is which event ID

You don't guess IDs — the **scoreboard tells you**. Step 1: ask the scoreboard for a date; it
returns a list of events, each with its `id` *and* the teams playing. Step 2: feed that `id`
into `/summary?event=`. So it's always two steps: *list the events for a day → pick the id → ask
for that match's details.* The loader does exactly this in a loop.

---

## 4. How ESPN's fields map to our columns

ESPN's `abbreviation` for each team is already the FIFA 3-letter code our schema uses
(`team_id` = `ENG`, `BRA`, `ARG`…), so teams need **no translation table**.

Per-player match stats live in `summary.rosters[].roster[].stats` as a list of
`{name, value}` objects. The mapping:

| Our `playerstat` column | ESPN source |
|---|---|
| `goals` | stat `totalGoals` |
| `assists` | stat `goalAssists` |
| `yellow_cards` | stat `yellowCards` |
| `red_cards` | stat `redCards` |
| `minutes_played` | **derived** (see below) |
| `clean_sheet` | **derived** — 1 for a player who appeared when their team conceded 0 |

ESPN has **no "minutes played" field**, so we compute it from the `starter` / `subbedIn` /
`subbedOut` flags plus the substitution events. Each substitution in `summary.keyEvents` carries
the exact minute (`clock.value / 60`) and who came on/off:

- started and not subbed off → **90**
- started and subbed off at minute *X* → **X**
- came on as a sub at minute *X* → **90 − X**
- didn't appear → **0**

That's accurate enough that the scoring engine's 60-minute appearance threshold is always right.

`position` comes from the roster endpoint as `G` / `D` / `M` / `F` and maps to our
`GK` / `DEF` / `MID` / `FWD`.

ESPN's `season.slug` gives the stage, mapped to our `match.stage` enum:
`group-stage→group_stage`, `round-of-32→round_of_32`, `round-of-16→round_of_16`,
`quarterfinals→quarter_final`, `semifinals→semi_final`, `final→final`
(the 3rd-place match is grouped under `final`).

`matchday` (an integer the squad/score logic keys off) is derived: group games are numbered 1–3
by each team's appearance order; knockouts are 4 (R32), 5 (R16), 6 (QF), 7 (SF), 8 (final).

---

## 5. The scripts and backend loader

The seed scripts connect to the same Supabase database as the app (via `DATABASE_URL` in `.env`).
IDs that ESPN assigns are saved to small JSON files in `tools/maps/` so the loaders can translate
external IDs to local database IDs.

| Script               | Does                                                                                                                                                        | Run when                                                    |
| ----------------------| -------------------------------------------------------------------------------------------------------------------------------------------------------------| -------------------------------------------------------------|
| `espn_client.py`     | thin wrapper over the four ESPN endpoints (the only file that knows ESPN's JSON shape)                                                                      | imported by the others                                      |
| `seed_team_matches.py` | inserts `users` (id 1), all `team`, all `match`; writes `maps/matchmap.json` (ESPN event id → our `match_id`)                                               | once, up front (re-runnable to back-fill knockout fixtures) |
| `seed_players.py`    | inserts every squad into `player`, assigns a `base_price`; writes `maps/idmap.json` (ESPN player id → our `player_id`)                                      | once, up front                                              |
| `scrape_wikipedia_squads.py` | scrapes the Wikipedia "2026 FIFA World Cup squads" page; writes `maps/tournament_squad.json` (48 teams × 26 players — the canonical roster) | once, after FIFA publishes final squads; re-run if injury replacements are announced |
| `activate_tournament_squads.py` | matches `tournament_squad.json` against the live `player` table by team_id + normalized name (exact + fuzzy), sets `in_tournament = true`, inserts missing players with position-based default prices | after `scrape_wikipedia_squads.py`; re-run when the Wikipedia map changes |
| `load_stats.py`      | CLI loader for finished matches; pulls per-player stats and POSTs each row to `/api/playerstats` | after each matchday, when running manually                 |
| `POST /api/load-stats` | backend loader route for the frontend Update Data flow when enabled; updates scorelines and inserts stats through `app/services/stat_loader.py` | when triggering refresh from the app or API                |

Both stat-loading paths use the existing scoring path, so scores are computed by
`app/core/scoring.py` and stored in `playerstat.score`. Re-running is safe: a stat that already
exists is skipped.

### Typical first run

```bash
# 1. preview what would be written (no DB changes)
python tools/run-once/seed_team_matches.py --dry-run

# 2. write teams + matches
python tools/run-once/seed_team_matches.py

# 3. write squads from ESPN rosters
python tools/run-once/seed_players.py

# 4. mark the canonical tournament roster from Wikipedia
python tools/run-once/scrape_wikipedia_squads.py
python tools/run-once/activate_tournament_squads.py

# 5. start the API, then load a finished matchday's stats from the CLI
uvicorn app.main:app --reload
python tools/repeat/load_stats.py --date 20260613

# or trigger the backend loader endpoint
curl -X POST http://127.0.0.1:8000/api/load-stats \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"20260613\"}"
```

`base_price` is assigned by the loader (no data source supplies fantasy prices): a per-position
base plus a small bonus for stronger nations, clamped to a 4.0–8.5 band so valid squads always
fit the budget. It's a deliberate, tunable convention documented inline in `seed_players.py`.
Players inserted by `activate_tournament_squads.py` (those in Wikipedia but missing from ESPN) get a
flat position-based default (GK/DEF $4.0, MID $4.5, FWD $5.0).

---

## 6. The caveats

ESPN's API is unofficial — it could change or disappear without notice. All the knowledge of
ESPN's JSON shape is isolated in `tools/espn_client.py`, so if ESPN ever changes something, that
one file is the only thing to fix. As a last resort, stats can always be entered by hand through
the Swagger UI at `/docs` (the SRS allows manual stat entry).

A second caveat: ESPN's roster endpoint is **not a reliable source for who is actually in the
tournament**. It misses players from several federations (smaller nations, late callups, post-injury
replacements). That is why `in_tournament` is sourced from Wikipedia's squad page instead of
inferred from `espn_id IS NOT NULL`. The ESPN roster is still useful for seeding the initial
`player` rows and the `idmap.json` translation table, but the canonical "is this player in WC2026"
answer comes from `tools/maps/tournament_squad.json`.
