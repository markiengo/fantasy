# Business Logic

Code là source of truth khi prose và code khác nhau.

## Tournament Roster (`in_tournament`)

`in_tournament` quyết định cầu thủ nào tham gia WC2026. Nguồn: Wikipedia (không dùng ESPN — roster ESPN không đầy đủ). Pipeline:

1. `tools/run-once/scrape_wikipedia_squads.py` → `tools/maps/tournament_squad.json`
2. `tools/run-once/activate_tournament_squads.py` match tên Wikipedia với `player` rows bằng `team_id` + normalized name (exact + fuzzy), set `in_tournament = true`, insert missing players.

`GET /api/players` filter `WHERE in_tournament = true`. `GET /api/players/{id}` không filter. Re-run cả hai script nếu có thay đổi squad do chấn thương.

## Squad Creation

`POST /api/squad` — validate qua `app/core/validation.py` trước khi write:

- Đúng 11 players, ID không trùng.
- Formation: 4-3-3 hoặc 4-4-2.
- Max 3 players cùng đội.
- Tổng `base_price` ≤ 50.

## Squad Reads & Inheritance

`GET /api/squad?matchday=N` trả về squad cho matchday N, hoặc squad gần nhất trước đó nếu chưa tạo cho N. Return 404 nếu không có squad nào trước đó.

## Transfers

`POST /api/transfer` — entry point duy nhất cho transfer. Check theo thứ tự:

- Cả hai players tồn tại.
- Transfer window đang mở (lock 1 giờ trước earliest kickoff của matchday).
- ≤ 5 transfers đã dùng cho matchday.
- `player_out` có trong effective squad.
- Squad sau swap pass tất cả squad rules.

`post_transfer()` write transfer, update `squadplayer` + `squad.budget_used`, commit/rollback atomically.

## Scoring

`app/core/scoring.py::calculate_score()` tính điểm v1. Được gọi khi insert stats qua `post_playerstats()`. Score lưu vào `playerstat.score` — không bao giờ recompute khi read.

## Stats Loading

Hai path, cả hai dùng `tools/maps/idmap.json` + `matchmap.json` để translate ESPN ID:

- `tools/repeat/load_stats.py` — CLI, gọi HTTP API.
- `POST /api/load-stats` — backend route cho frontend Update Data button. Auto-discover các match dates thiếu stats bằng cách query completed matches chưa có `playerstat` entries.

`in_tournament` độc lập với stat loading — stats key bằng `player_id`.
