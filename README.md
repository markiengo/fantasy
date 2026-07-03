# World Cup Fantasy Football 2026

Build an 11-player World Cup fantasy squad, assign a captain, make matchday transfers, and score points from real match data.

**Stack:** FastAPI + raw SQL (`psycopg2`/`RealDictCursor`) + Supabase PostgreSQL/Auth, vanilla HTML/CSS/JS, ESPN API data tooling.

## Quickstart

```bash
source .venv/Scripts/activate
pip install -r requirements.txt
echo "DATABASE_URL=postgresql://..." > .env
uvicorn app.main:app --reload
```

Frontend and API run from the same FastAPI process on port 8000:

- Frontend: `http://127.0.0.1:8000/`
- API base: `http://127.0.0.1:8000/api`
- OpenAPI docs: `http://127.0.0.1:8000/docs`

Most user routes require Supabase bearer auth. Public catalog routes include players, teams, matches, player stats, and username helpers. The frontend can fall back to mock data only when the backend is unreachable; real `401`/`403` auth failures are not treated as mock mode.

## Tests

```bash
pytest tests/ -v
```

Focused coverage currently includes validation rules, stat loading, leaderboard behavior, and demo-seeding helpers.

## File Structure

```text
fantasy-wc/
|-- app/
|   |-- main.py             # FastAPI app, /api routers, static frontend mount
|   |-- auth.py             # Supabase JWT verification and current_user mapping
|   |-- permissions.py      # Admin authorization helper
|   |-- database.py         # Threaded psycopg2 pool and transaction dependency
|   |-- schemas.py          # Pydantic request models
|   |-- routers/            # Route handlers
|   |-- queries/            # Raw SQL functions
|   |-- services/           # Stat loading
|   `-- core/
|       |-- scoring.py      # Base score and captain helpers
|       `-- validation.py   # Squad and transfer rules
|
|-- frontend/               # HTML/CSS/JS app
|-- tools/
|   |-- espn_client.py      # ESPN API wrapper
|   |-- demo_seed.py        # Demo manager seeding engine
|   |-- run-once/           # Setup and seed scripts
|   |-- repeat/             # Repeatable loaders/verifiers
|   `-- maps/               # ESPN ID -> DB ID maps
|
|-- docs/                   # schema.sql, API.md, SRS.md, diagrams
|-- tests/
`-- requirements.txt
```

## Key Docs

| File | Purpose |
|---|---|
| [docs/schema.sql](docs/schema.sql) | DDL snapshot, column names, constraints. |
| [docs/API.md](docs/API.md) | Canonical API and game-logic contract. |
| [docs/SRS.md](docs/SRS.md) | Presentation-ready requirements, architecture, decisions, and tradeoffs. |
| [docs/ERD.png](docs/ERD.png) | ERD visual reference. |
| [docs/DBdesign.jpg](docs/DBdesign.jpg) | Database design visual reference. |
| [personal/PRODUCT.md](personal/PRODUCT.md) | Local/private senior-engineer study guide. |
