# World Cup Fantasy Football 2026

Build đội hình 11 cầu thủ trong budget, transfer giữa các matchday, tích điểm từ thành tích thực tế.

**Stack:** FastAPI + psycopg2 + Supabase PostgreSQL, vanilla HTML/CSS/JS, ESPN API data tooling.

---

## Quickstart

```bash
source .venv/Scripts/activate
pip install -r requirements.txt
echo "DATABASE_URL=postgresql://..." > .env
python tools/run-once/seed_team_matches.py
python tools/run-once/seed_players.py
uvicorn app.main:app --reload
```

Mọi thứ chạy trên port 8000: frontend tại `/`, API tại `/api`, docs tại `/docs`. Same-origin, no CORS. Frontend fallback sang demo data nếu backend down.

---

## Tests

```bash
pytest tests/ -v
```

Cover validation rules và stat-loader service. Không có linter hay build step.

---

## File Structure

```text
fantasy-wc/
|-- app/
|   |-- main.py             # FastAPI app, /api routers, static frontend mount
|   |-- auth.py             # Supabase JWT verification (RS256 + ES256)
|   |-- database.py         # get_db() dependency, psycopg2 + RealDictCursor
|   |-- schemas.py          # Pydantic request models
|   |-- routers/            # Route handlers
|   |-- queries/            # Raw SQL functions
|   |-- services/           # Stat loading
|   `-- core/
|       |-- scoring.py      # calculate_score()
|       `-- validation.py   # Squad and transfer rules
|
|-- frontend/               # HTML/CSS/JS
|-- tools/
|   |-- espn_client.py      # ESPN API wrapper
|   |-- run-once/           # seed_team_matches, seed_players, scrape_wikipedia_squads, activate_tournament_squads
|   |-- repeat/             # load_stats, smoke-test
|   `-- maps/               # ESPN ID -> DB ID maps
|
|-- docs/                   # schema.sql, API.md, SRS.md, logic.md, espn.md
|-- tests/
`-- requirements.txt
```

---

## Key Docs

| File | Purpose |
|---|---|
| [docs/schema.sql](docs/schema.sql) | DDL, column names, constraints |
| [docs/API.md](docs/API.md) | Endpoint shapes và error codes |
| [docs/logic.md](docs/logic.md) | Business logic reference |
| [docs/espn.md](docs/espn.md) | ESPN data pipeline |
| [docs/SRS.md](docs/SRS.md) | Requirements và game rules |
