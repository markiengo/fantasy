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

There are **two kinds of URLs** for every piece of data ESPN serves:

- **API URL** — the JSON endpoint a program calls (returns raw structured data)
- **User URL** — the human-readable ESPN.com page a browser opens (returns HTML with the same data, prettified)

For every match, team, and player, ESPN's JSON includes `links` arrays that contain the
corresponding user-facing URL. So from the API response alone, you can always find the
human-readable page.

### The four endpoints

| Resource                     | API URL                                                                    | Returns                                                 | Fills        |
| ------------------------------| ---------------------------------------------------------------------------| ---------------------------------------------------------| --------------|
| `/teams`                     | `…/fifa.world/teams`                                                       | all 48 teams (id, abbreviation, name, logo, color)     | `team`       |
| `/teams/{teamId}/roster`     | `…/fifa.world/teams/{teamId}/roster`                                       | one nation's squad (player id, name, position, stats)  | `player`     |
| `/scoreboard?dates=YYYYMMDD` | `…/fifa.world/scoreboard?dates=20260611`                                   | the fixtures on a date (event ids, teams, score, stage)| `match`      |
| `/summary?event={eventId}`   | `…/fifa.world/summary?event=760415`                                        | one match's full details (per-player stats, lineups, play-by-play, team stats) | `playerstat` |

You can paste any API URL into a browser right now and see the JSON.

---

### 3.1 `/teams` — all 48 nations

**API URL:**
```
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams
```

**User URL (human-readable team list):**
```
https://www.espn.com/soccer/teams/_/league/fifa.world
```

**What you get:** a `sports[0].leagues[0].teams` array, one entry per nation. Each team object
contains the ESPN internal `id`, the `abbreviation` (which is the FIFA 3-letter code we use as
`team_id`), display name, logo URL, team colors, and links to the ESPN clubhouse page.

**Real JSON example** (truncated to 2 of 48 teams for readability):

```json
{
  "sports": [{
    "leagues": [{
      "id": "606",
      "name": "FIFA World Cup",
      "slug": "fifa.world",
      "season": { "year": 2026, "displayName": "2026" },
      "teams": [
        {
          "team": {
            "id": "202",
            "abbreviation": "ARG",
            "displayName": "Argentina",
            "name": "Argentina",
            "shortDisplayName": "Argentina",
            "slug": "arg",
            "color": "74acdf",
            "alternateColor": "173E69",
            "logos": [{
              "href": "https://a.espncdn.com/i/teamlogos/countries/500/arg.png",
              "width": 500, "height": 500
            }],
            "links": [{
              "rel": ["clubhouse", "desktop", "team"],
              "href": "https://www.espn.com/soccer/team/_/id/202/argentina",
              "text": "Clubhouse"
            }]
          }
        },
        {
          "team": {
            "id": "203",
            "abbreviation": "MEX",
            "displayName": "Mexico",
            "name": "Mexico",
            "slug": "mex",
            "color": "006847",
            "logos": [{
              "href": "https://a.espncdn.com/i/teamlogos/countries/500/mex.png",
              "width": 500, "height": 500
            }],
            "links": [{
              "rel": ["clubhouse", "desktop", "team"],
              "href": "https://www.espn.com/soccer/team/_/id/203/mexico",
              "text": "Clubhouse"
            }]
          }
        }
      ]
    }]
  }]
}
```

**How our code extracts values:**

```python
for entry in data["sports"][0]["leagues"][0]["teams"]:
    team = entry["team"]
    team_id = team["abbreviation"]     # "MEX" — already the FIFA code, becomes our team_id
    name     = team["displayName"]     # "Mexico"
    logo     = team["logos"][0]["href"]  # "https://a.espncdn.com/i/teamlogos/countries/500/mex.png"
    espn_id  = team["id"]              # "203" — stored for later lookups (roster, scoreboard)
```

The `abbreviation` is already the FIFA 3-letter code (`ENG`, `BRA`, `ARG`…), so teams need
**no translation table** — `abbreviation` goes straight into our `team.team_id` column.

---

### 3.2 `/teams/{teamId}/roster` — one nation's squad

**API URL:**
```
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/203/roster
```

(Team ID `203` = Mexico. Get the ID from the `/teams` response.)

**User URL (human-readable squad page):**
```
https://www.espn.com/soccer/team/squad/_/id/203/mexico
```

**What you get:** an `athletes` array, one entry per player. Each athlete object contains the
ESPN player `id`, full name, jersey number, position (`G` / `D` / `M` / `F`), height, weight,
date of birth, citizenship, a headshot URL, and a `statistics.splits` block with
tournament-wide aggregated stats (appearances, goals, assists, cards, etc.).

**Real JSON example** (truncated to 2 players for readability):

```json
{
  "timestamp": "2026-07-01T09:16:36Z",
  "status": "success",
  "season": { "year": 2026, "displayName": "2026 FIFA World Cup" },
  "athletes": [
    {
      "id": "290899",
      "fullName": "Raúl Rangel",
      "displayName": "Raúl Rangel",
      "shortName": "R. Rangel",
      "jersey": "1",
      "position": { "abbreviation": "G", "name": "Goalkeeper" },
      "height": 75.0, "displayHeight": "6' 3\"",
      "weight": 192.0, "displayWeight": "192 lbs",
      "age": 26,
      "dateOfBirth": "2000-02-25T08:00Z",
      "citizenship": "Mexico",
      "headshot": { "href": "https://a.espncdn.com/i/headshots/soccer/players/full/290899.png" },
      "links": [{
        "rel": ["playercard", "desktop", "athlete"],
        "href": "https://www.espn.com/soccer/player/_/id/290899/raul-rangel",
        "text": "Player Card"
      }],
      "statistics": {
        "splits": {
          "categories": [
            {
              "name": "general",
              "stats": [
                { "name": "appearances", "value": 4.0, "displayValue": "4" },
                { "name": "yellowCards", "value": 0.0, "displayValue": "0" },
                { "name": "redCards",   "value": 0.0, "displayValue": "0" }
              ]
            },
            {
              "name": "goalKeeping",
              "stats": [
                { "name": "saves",         "value": 6.0, "displayValue": "6" },
                { "name": "goalsConceded", "value": 0.0, "displayValue": "0" }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "233075",
      "fullName": "Julián Quiñones",
      "displayName": "Julián Quiñones",
      "shortName": "J. Quiñones",
      "jersey": "16",
      "position": { "abbreviation": "F", "name": "Forward" },
      "links": [{
        "rel": ["playercard", "desktop", "athlete"],
        "href": "https://www.espn.com/soccer/player/_/id/233075/julian-quinones",
        "text": "Player Card"
      }],
      "statistics": {
        "splits": {
          "categories": [
            {
              "name": "general",
              "stats": [
                { "name": "appearances", "value": 4.0, "displayValue": "4" },
                { "name": "yellowCards", "value": 0.0, "displayValue": "0" },
                { "name": "redCards",   "value": 0.0, "displayValue": "0" }
              ]
            },
            {
              "name": "offensive",
              "stats": [
                { "name": "totalGoals",  "value": 3.0, "displayValue": "3" },
                { "name": "goalAssists", "value": 1.0, "displayValue": "1" },
                { "name": "shotsOnTarget", "value": 5.0, "displayValue": "5" }
              ]
            }
          ]
        }
      }
    }
  ],
  "coach": [
    { "id": "136", "firstName": "Javier", "lastName": "Aguirre" }
  ],
  "team": {
    "id": "203", "abbreviation": "MEX", "displayName": "Mexico",
    "logo": "https://a.espncdn.com/i/teamlogos/countries/500/mex.png"
  }
}
```

**How our code extracts values:**

```python
for athlete in data["athletes"]:
    espn_id  = athlete["id"]                          # "290899"
    name     = athlete["displayName"]                 # "Raúl Rangel"
    jersey   = athlete["jersey"]                      # "1"
    pos_abbr = athlete["position"]["abbreviation"]    # "G" → maps to "GK"
    # position mapping: G→GK, D→DEF, M→MID, F→FWD
    headshot = athlete.get("headshot", {}).get("href")  # optional, may be missing
```

The `links` array contains the user-facing player card URL:
`https://www.espn.com/soccer/player/_/id/290899/raul-rangel`

---

### 3.3 `/scoreboard?dates=YYYYMMDD` — fixtures for a date

**API URL:**
```
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611
```

**User URL (human-readable scoreboard for that date):**
```
https://www.espn.com/soccer/scoreboard/_/league/fifa.world/date/20260611
```

**What you get:** an `events` array, one entry per match that day. Each event contains:

- `id` — the event ID (needed for `/summary`)
- `date` — kickoff time in ISO format
- `name` / `shortName` — e.g. "South Africa at Mexico" / "RSA @ MEX"
- `season.slug` — the stage: `group-stage`, `round-of-16`, `quarterfinals`, etc.
- `status` — match state (`pre`, `in`, `post`) and clock
- `competitions[0].competitors` — two team objects with `score`, `winner`, `team` details
- `competitions[0].details` — goals, cards, substitutions with player IDs and minute
- `competitions[0].venue` — stadium name, city, country
- `links` — user-facing URLs for match summary, highlights, recap, stats, bracket

**Real JSON example** (truncated to 1 of 2 events for readability — this is the World Cup
opening match, Mexico vs South Africa on June 11, 2026):

```json
{
  "leagues": [{
    "id": "606",
    "name": "FIFA World Cup",
    "slug": "fifa.world",
    "season": {
      "year": 2026,
      "displayName": "2026 FIFA World Cup",
      "type": { "id": "2", "name": "Round of 32" }
    },
    "calendar": [{
      "label": "FIFA World Cup",
      "entries": [
        { "label": "Group",          "detail": "Jun 11-27",  "value": "1" },
        { "label": "Round of 32",    "detail": "Jun 28-Jul 3","value": "2" },
        { "label": "Rd of 16",       "detail": "Jul 4-7",    "value": "3" },
        { "label": "Quarterfinals",  "detail": "Jul 9-11",   "value": "4" },
        { "label": "Semifinals",     "detail": "Jul 14-15",  "value": "5" },
        { "label": "3rd-Place Match","detail": "Jul 18",     "value": "6" },
        { "label": "Final",          "detail": "Jul 19",     "value": "7" }
      ]
    }]
  }],
  "events": [
    {
      "id": "760415",
      "date": "2026-06-11T19:00Z",
      "name": "South Africa at Mexico",
      "shortName": "RSA @ MEX",
      "season": { "year": 2026, "type": 13802, "slug": "group-stage" },
      "status": {
        "clock": 5400.0,
        "displayClock": "90'+8'",
        "type": {
          "name": "STATUS_FULL_TIME",
          "state": "post",
          "completed": true,
          "detail": "FT"
        }
      },
      "competitions": [{
        "id": "760415",
        "date": "2026-06-11T19:00Z",
        "attendance": 80824,
        "venue": {
          "fullName": "Estadio Banorte",
          "address": { "city": "Mexico City", "country": "Mexico" }
        },
        "competitors": [
          {
            "id": "203",
            "homeAway": "home",
            "winner": true,
            "score": "2",
            "team": {
              "id": "203",
              "abbreviation": "MEX",
              "displayName": "Mexico",
              "logo": "https://a.espncdn.com/i/teamlogos/countries/500/mex.png",
              "color": "006847"
            },
            "statistics": [
              { "name": "totalGoals",   "displayValue": "2" },
              { "name": "goalAssists",  "displayValue": "2" },
              { "name": "possessionPct","displayValue": "60.5" },
              { "name": "totalShots",   "displayValue": "16" },
              { "name": "shotsOnTarget","displayValue": "4" }
            ]
          },
          {
            "id": "467",
            "homeAway": "away",
            "winner": false,
            "score": "0",
            "team": {
              "id": "467",
              "abbreviation": "RSA",
              "displayName": "South Africa",
              "logo": "https://a.espncdn.com/i/teamlogos/countries/500/rsa.png"
            }
          }
        ],
        "details": [
          {
            "type": { "id": "70", "text": "Goal" },
            "clock": { "value": 513.0, "displayValue": "9'" },
            "team": { "id": "203" },
            "scoreValue": 1,
            "scoringPlay": true,
            "athletesInvolved": [{
              "id": "233075",
              "displayName": "Julián Quiñones",
              "jersey": "16",
              "position": "LM"
            }]
          },
          {
            "type": { "id": "94", "text": "Yellow Card" },
            "clock": { "value": 981.0, "displayValue": "17'" },
            "team": { "id": "467" },
            "athletesInvolved": [{
              "id": "256691",
              "displayName": "Teboho Mokoena",
              "jersey": "4"
            }]
          },
          {
            "type": { "id": "137", "text": "Goal - Header" },
            "clock": { "value": 3996.0, "displayValue": "67'" },
            "team": { "id": "203" },
            "scoreValue": 1,
            "athletesInvolved": [{
              "id": "167060",
              "displayName": "Raúl Jiménez",
              "jersey": "9",
              "position": "F"
            }]
          },
          {
            "type": { "id": "93", "text": "Red Card" },
            "clock": { "value": 2940.0, "displayValue": "49'" },
            "team": { "id": "467" },
            "athletesInvolved": [{
              "id": "228595",
              "displayName": "Sphephelo Sithole",
              "jersey": "13"
            }]
          }
        ],
        "headlines": [{
          "description": "Mexico's misery in World Cup opening games was finally ended as they secured a 2-0 win over South Africa at the Estadio Azteca in a match featuring three red cards.",
          "type": "Recap"
        }]
      }],
      "links": [
        {
          "rel": ["summary", "desktop", "event"],
          "href": "https://www.espn.com/soccer/match/_/gameId/760415/south-africa-mexico",
          "text": "Summary"
        },
        {
          "rel": ["recap", "desktop", "event"],
          "href": "https://www.espn.com/soccer/report/_/gameId/760415",
          "text": "Report"
        },
        {
          "rel": ["stats", "desktop", "event"],
          "href": "https://www.espn.com/soccer/matchstats/_/gameId/760415",
          "text": "Statistics"
        },
        {
          "rel": ["bracket", "desktop", "event"],
          "href": "https://www.espn.com/soccer/bracket/_/season/2026/league/fifa.world",
          "text": "Bracket"
        }
      ]
    },
    {
      "id": "760414",
      "date": "2026-06-12T02:00Z",
      "name": "Czechia at South Korea",
      "shortName": "CZE @ KOR",
      "season": { "slug": "group-stage" }
    }
  ]
}
```

**How our code extracts values:**

```python
for event in data["events"]:
    event_id  = event["id"]                          # "760415"
    date      = event["date"]                        # "2026-06-11T19:00Z"
    stage     = event["season"]["slug"]              # "group-stage"
    completed = event["status"]["type"]["completed"] # True

    comp = event["competitions"][0]
    home = comp["competitors"][0]  # order 0 = home
    away = comp["competitors"][1]  # order 1 = away

    home_team_id = home["team"]["abbreviation"]      # "MEX"
    home_score   = int(home["score"])                # 2
    away_team_id = away["team"]["abbreviation"]      # "RSA"
    away_score   = int(away["score"])                # 0

    venue = comp["venue"]["fullName"]                # "Estadio Banorte"
    city  = comp["venue"]["address"]["city"]         # "Mexico City"
```

The `details` array gives goals, cards, and substitutions with the ESPN player ID and the
minute (`clock.value / 60`). The `links` array gives the user-facing match summary page:
`https://www.espn.com/soccer/match/_/gameId/760415/south-africa-mexico`

The `calendar` entries in the league object reveal the full tournament structure — group
dates, each knockout round's date range, and the type IDs ESPN uses internally.

---

### 3.4 `/summary?event={eventId}` — one match's full details

This is the richest endpoint. It returns everything ESPN knows about a single match: team
statistics, per-player statistics, lineups, formations, substitutions, play-by-play
commentary, head-to-head history, recent form, and group standings.

**API URL:**
```
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=760415
```

(Event ID `760415` = Mexico vs South Africa, June 11 2026. Get the ID from the scoreboard.)

**User URL (human-readable match summary):**
```
https://www.espn.com/soccer/match/_/gameId/760415/south-africa-mexico
```

**User URL (match statistics page):**
```
https://www.espn.com/soccer/matchstats/_/gameId/760415
```

**What you get — top-level keys in the JSON:**

| Key             | Contains                                                                 |
| -----------------| ------------------------------------------------------------------------|
| `boxscore`      | recent form for both teams, team-level match statistics, lineups        |
| `gameInfo`      | venue, attendance, officials (referee name)                             |
| `leaders`       | per-match stat leaders (top scorer, top passer, top defender, saves)   |
| `headToHeadGames`| historical meetings between the two teams                             |
| `rosters`       | full lineups with per-player match stats (goals, assists, cards, mins) |
| `commentary`    | play-by-play text (every event with clock, player, field position)     |
| `standings`     | live group standings updated after the match                           |

**Real JSON — `boxscore.teams` (team-level match stats):**

```json
{
  "boxscore": {
    "teams": [
      {
        "team": {
          "id": "203",
          "abbreviation": "MEX",
          "displayName": "Mexico",
          "logo": "https://a.espncdn.com/i/teamlogos/countries/500/mex.png",
          "color": "006847"
        },
        "statistics": [
          { "name": "possessionPct",  "displayValue": "60.5", "label": "Possession" },
          { "name": "totalShots",     "displayValue": "16",    "label": "SHOTS" },
          { "name": "shotsOnTarget",  "displayValue": "4",     "label": "ON GOAL" },
          { "name": "totalGoals",     "displayValue": "2",     "label": "Goals" },
          { "name": "goalAssists",    "displayValue": "2",     "label": "Assists" },
          { "name": "yellowCards",    "displayValue": "1",     "label": "Yellow Cards" },
          { "name": "redCards",       "displayValue": "1",     "label": "Red Cards" },
          { "name": "foulsCommitted", "displayValue": "12",    "label": "Fouls" },
          { "name": "wonCorners",     "displayValue": "3",     "label": "Corner Kicks" },
          { "name": "saves",          "displayValue": "2",     "label": "Saves" },
          { "name": "accuratePasses", "displayValue": "467",   "label": "Accurate Passes" },
          { "name": "totalPasses",    "displayValue": "520",   "label": "Passes" },
          { "name": "passPct",        "displayValue": "0.9",   "label": "Pass Completion %" }
        ],
        "homeAway": "home"
      },
      {
        "team": {
          "id": "467",
          "abbreviation": "RSA",
          "displayName": "South Africa"
        },
        "statistics": [
          { "name": "possessionPct", "displayValue": "39.5" },
          { "name": "totalShots",    "displayValue": "3" },
          { "name": "totalGoals",    "displayValue": "0" },
          { "name": "redCards",      "displayValue": "2" }
        ],
        "homeAway": "away"
      }
    ]
  }
}
```

**Real JSON — `leaders` (per-match individual stat leaders):**

```json
{
  "leaders": [
    {
      "team": { "id": "203", "abbreviation": "MEX" },
      "leaders": [
        {
          "name": "totalShots",
          "displayName": "Total Shots",
          "leaders": [{
            "displayValue": "5",
            "athlete": {
              "id": "233075",
              "fullName": "Julián Quiñones",
              "jersey": "16",
              "position": { "abbreviation": "F" }
            },
            "statistics": [
              { "name": "totalShots",    "value": 5.0 },
              { "name": "shotsOnTarget", "value": 2.0 },
              { "name": "expectedGoals", "value": 0.37 }
            ]
          }]
        },
        {
          "name": "saves",
          "displayName": "Saves",
          "leaders": [{
            "displayValue": "2",
            "athlete": {
              "id": "290899",
              "fullName": "Raúl Rangel",
              "jersey": "1",
              "position": { "abbreviation": "G" }
            }
          }]
        }
      ]
    }
  ]
}
```

**Real JSON — `rosters` (per-player match stats — this is what fills `playerstat`):**

The `rosters` array contains two team entries, each with a `roster` array of every player
who appeared. Each player has a `stats` list of `{name, value}` pairs:

```json
{
  "rosters": [
    {
      "team": { "id": "203", "abbreviation": "MEX" },
      "roster": [
        {
          "athlete": {
            "id": "290899",
            "displayName": "Raúl Rangel",
            "jersey": "1",
            "position": { "abbreviation": "G" }
          },
          "starter": true,
          "stats": [
            { "name": "totalGoals",   "value": 0 },
            { "name": "goalAssists",  "value": 0 },
            { "name": "yellowCards",  "value": 0 },
            { "name": "redCards",     "value": 0 },
            { "name": "saves",        "value": 2 },
            { "name": "shotsOnTarget","value": 0 }
          ]
        },
        {
          "athlete": {
            "id": "233075",
            "displayName": "Julián Quiñones",
            "jersey": "16",
            "position": { "abbreviation": "F" }
          },
          "starter": true,
          "stats": [
            { "name": "totalGoals",    "value": 1 },
            { "name": "goalAssists",   "value": 0 },
            { "name": "yellowCards",   "value": 0 },
            { "name": "shotsOnTarget", "value": 2 }
          ]
        },
        {
          "athlete": {
            "id": "167060",
            "displayName": "Raúl Jiménez",
            "jersey": "9",
            "position": { "abbreviation": "F" }
          },
          "starter": true,
          "stats": [
            { "name": "totalGoals",  "value": 1 },
            { "name": "goalAssists", "value": 0 }
          ]
        }
      ]
    }
  ]
}
```

**Real JSON — `commentary` (play-by-play, truncated to 3 events):**

```json
{
  "commentary": [
    {
      "sequence": 1,
      "time": { "value": 0.0, "displayValue": "" },
      "text": "Match ends, Mexico 2, South Africa 0."
    },
    {
      "sequence": 11,
      "time": { "value": 513.0, "displayValue": "9'" },
      "text": "Goal! Mexico 1, South Africa 0. Julián Quiñones (Mexico) right footed shot from the centre of the box to the bottom left corner.",
      "play": {
        "type": { "id": "70", "text": "Goal" },
        "participants": [{ "athlete": { "displayName": "Julián Quiñones" } }]
      },
      "clock": { "value": 513.0 }
    },
    {
      "sequence": 66,
      "time": { "value": 3996.0, "displayValue": "67'" },
      "text": "Goal! Mexico 2, South Africa 0. Raúl Jiménez (Mexico) header from very close range to the bottom left corner. Assisted by Roberto Alvarado with a cross.",
      "play": {
        "type": { "id": "137", "text": "Goal - Header" },
        "participants": [
          { "athlete": { "displayName": "Raúl Jiménez" } },
          { "athlete": { "displayName": "Roberto Alvarado" } }
        ]
      }
    }
  ]
}
```

**How our code extracts per-player stats:**

```python
for team_entry in data["rosters"]:
    team_id = team_entry["team"]["abbreviation"]      # "MEX"
    for player in team_entry["roster"]:
        espn_id = player["athlete"]["id"]              # "233075"
        starter = player.get("starter", False)         # True
        stats   = { s["name"]: s["value"] for s in player["stats"] }

        goals        = stats.get("totalGoals", 0)      # 1
        assists      = stats.get("goalAssists", 0)     # 0
        yellow_cards = stats.get("yellowCards", 0)     # 0
        red_cards    = stats.get("redCards", 0)        # 0
```

**How we derive minutes played** (ESPN has no "minutes played" field):

The substitution events are in `commentary` (or `boxscore`), each with `clock.value` (seconds)
and `play.type.text == "Substitution"`. The participants array tells you who came on and who
went off. Combined with the `starter` flag from `rosters`:

- started and not subbed off → **90**
- started and subbed off at minute *X* → **X**
- came on as a sub at minute *X* → **90 − X**
- didn't appear → **0**

That's accurate enough that the scoring engine's 60-minute appearance threshold is always right.

---

### 3.5 How the four endpoints chain together

The loader never guesses IDs. It always follows this two-step chain:

```
STEP 1:  /scoreboard?dates=20260611
         → returns events[] with each event's "id" and team IDs

STEP 2:  /summary?event=760415
         → returns per-player stats for that match
```

For seeding (one-time setup), the chain is:

```
/teams                          → 48 nations (team_id = abbreviation)
  └─ /teams/{teamId}/roster     → each nation's squad (player id, name, position)
                                   writes idmap.json (ESPN player id → our player_id)

/scoreboard?dates=20260611      → event IDs for that date
  └─ /summary?event={eventId}   → per-player stats for each match
                                   writes matchmap.json (ESPN event id → our match_id)
```

You can paste any of these API URLs into a browser right now and see the JSON. The
corresponding human-readable ESPN.com pages are always in the `links` arrays inside the JSON
response — look for entries with `"rel": ["summary", "desktop", "event"]` or
`"rel": ["clubhouse", "desktop", "team"]` or `"rel": ["playercard", "desktop", "athlete"]`.

---

## 4. How ESPN's fields map to our columns

ESPN's `abbreviation` for each team is already the FIFA 3-letter code our schema uses
(`team_id` = `ENG`, `BRA`, `ARG`…), so teams need **no translation table**.

Per-player match stats live in `summary.rosters[].roster[].stats` as a list of
`{name, value}` objects. The mapping:

| Our `playerstat` column | ESPN source                                                          |
| -------------------------| ----------------------------------------------------------------------|
| `goals`                 | stat `totalGoals`                                                    |
| `assists`               | stat `goalAssists`                                                   |
| `yellow_cards`          | stat `yellowCards`                                                   |
| `red_cards`             | stat `redCards`                                                      |
| `minutes_played`        | **derived** (see below)                                              |
| `clean_sheet`           | **derived** — 1 for a player who appeared when their team conceded 0 |

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
