# API Specification
**Version:** 2.4  
**Last Updated:** 2026-06-25

---

## Base Path

Tất cả endpoint mounted dưới **`/api`** (vd: `GET /api/players`). Prefix lược bỏ dưới đây.

---

## Response Format

Success: JSON object hoặc array. Error: `{ "detail": "..." }`.

---

## Auth

Supabase JWT qua `Authorization: Bearer <token>`. Server map `sub` sang local `users` row, scope data bằng `current_user["user_id"]`.

- Identity đến từ verified token, **không** từ client-supplied `user_id`.
- Self-scoped routes (`/squad`, `/transfers`, `/transfer`, `/score`, `/me`) — không nhận `user_id` trong body/query.
- `/load-stats` yêu cầu role `admin`.

| HTTP | Ý nghĩa |
|---|---|
| `401` | Token thiếu, hết hạn, hoặc không hợp lệ. |
| `403` | Đã xác thực nhưng không được phép (non-admin gọi route admin, hoặc `is_active = false`). |

> Public read-only endpoints (`/players`, `/teams`, `/matches`, `/playerstats`) không yêu cầu auth trong v1.

---

## 1. Players

### GET `/players`
Filter player pool theo vị trí, đội, giá (UC-01, FR-01).

> Chỉ trả về `in_tournament = true`. Inactive rows truy xuất qua `GET /players/{id}`.

| Param | Type | Required | Description |
|---|---|---|---|
| `name` | string | No | Partial name match (case-insensitive) |
| `position` | string | No | `GK`, `DEF`, `MID`, `FWD` |
| `team_id` | string | No | FIFA 3-letter code |
| `max_price` | float | No | Giá tối đa ($M) |

**200:** Array — player_id, name, position, team_id, team_name, base_price.

---

### GET `/players/{player_id}`

| Param | Type | Required |
|---|---|---|
| `player_id` | int | Yes |

**200:** Single player object. **404:** Không tồn tại.

---

## 2. Teams

### GET `/teams`
**200:** Array — team_id, name, fifa_ranking, elo_rating, group_stage.

---

## 3. Matches

### GET `/matches`

| Param | Type | Required | Description |
|---|---|---|---|
| `matchday` | int | No | Số vòng đấu |
| `stage` | string | No | `group_stage`, `round_of_32`, `round_of_16`, `quarter_final`, `semi_final`, `final` |

**200:** Array — match_id, team1_id, team1_name, team2_id, team2_name, matchday, stage, date, kickoff, team1_score, team2_score.

---

### GET `/matches/{match_id}`

| Param | Type | Required |
|---|---|---|
| `match_id` | int | Yes |

**200:** Match object + `stats` array (stat_id, player_id, player_name, goals, assists, minutes_played, yellow_cards, red_cards, clean_sheet, score). **404:** Không tồn tại.

---

## 4. Squad

### GET `/squad`
Lấy squad cho một matchday (UC-03, FR-06). Scoped theo authenticated user.

**Auth:** Bearer token.

| Param | Type | Required |
|---|---|---|
| `matchday` | int | Yes |

**200:** squad_id, matchday, budget_used, budget_remaining, players array. **401:** Không có token. **404:** Chưa có squad cho matchday này.

---

### POST `/squad`
Tạo squad (11 players). Validate formation, budget, team limit (UC-02, GR-01→GR-04). Scoped theo authenticated user.

**Auth:** Bearer token.

| Field | Type | Required | Description |
|---|---|---|---|
| `matchday` | int | Yes | Matchday |
| `player_ids` | int[] | Yes | Đúng 11 player_ids |

**201:** Squad object. **400:** Squad đã tồn tại hoặc vi phạm rule. **401:** Không có token. **404:** Player không tồn tại.

---

## 5. Transfers

### GET `/transfers`
Transfer history của authenticated user (UC-05, FR-11).

**Auth:** Bearer token.

| Param | Type | Required |
|---|---|---|
| `matchday` | int | No |

**200:** Array — transfer_id, player_in_id, player_in_name, player_out_id, player_out_name, matchday. **401:** Không có token.

---

### POST `/transfer`
Swap one player out, one in (UC-04, GR-05→GR-07). Scoped theo authenticated user.

**Auth:** Bearer token.

| Field | Type | Required | Description |
|---|---|---|---|
| `player_in_id` | int | Yes | Player mua vào |
| `player_out_id` | int | Yes | Player bán ra |
| `matchday` | int | Yes | Matchday |

**201:** Transfer object với transfers_used, transfers_remaining, budget_remaining. **400:** Hết transfer, window đóng, player không có trong squad, hoặc vi phạm rule. **401:** Không có token. **404:** Player hoặc squad không tồn tại.

---

## 6. Player Stats

### GET `/playerstats`

| Param | Type | Required |
|---|---|---|
| `match_id` | int | No |
| `player_id` | int | No |

**200:** Array — stat_id, player_id, player_name, match_id, goals, assists, minutes_played, yellow_cards, red_cards, clean_sheet, score.

---

### POST `/playerstats`
Insert stats cho một player trong một match. Trigger scoring engine (UC-11, GR-08).

| Field | Type | Required | Description |
|---|---|---|---|
| `player_id` | int | Yes | |
| `match_id` | int | Yes | |
| `goals` | int | Yes | |
| `assists` | int | Yes | |
| `minutes_played` | int | Yes | |
| `yellow_cards` | int | Yes | |
| `red_cards` | int | Yes | 0 hoặc 1 |
| `clean_sheet` | int | Yes | 0 hoặc 1 (DEF/GK only) |

**201:** Stat object với computed score. **400:** Stat đã tồn tại hoặc team mismatch. **404:** Player hoặc match không tồn tại.

---

### POST `/playerstats/bulk`
Batch insert. Machine-level only (vd: `tools/repeat/load_stats.py`).

| Field | Type | Required |
|---|---|---|
| `stats` | PlayerStatCreate[] | Yes |

**201:** `{ inserted, errors, results, errors_detail }`. **400:** Validation errors trong `errors_detail`.

---

### POST `/load-stats`
Trigger ESPN stat loading từ backend (frontend Update Data button). Update match scorelines, insert player stats qua scoring path.

**Auth:** Bearer token + admin role.

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | string | No | Single date `YYYYMMDD` |
| `from_date` | string | No | Range start (requires `to_date`) |
| `to_date` | string | No | Range end (requires `from_date`) |
| `dry_run` | bool | No | Fetch without writing |

Nếu không truyền date, auto-discover completed matches thiếu `playerstat` entries.

**200:** Summary — matches_seen, matches_completed, matches_updated, inserted, skipped_existing, skipped_unmapped_player, skipped_unmapped_match, errors, errors_detail. **400:** Invalid dates. **401:** Không có token. **403:** Non-admin. **500:** Loader failure.

---

## 7. Scoring

### GET `/score`
Điểm squad cho một matchday, hoặc cumulative nếu không truyền matchday (UC-07→UC-09, GR-08). Scoped theo authenticated user.

**Auth:** Bearer token.

| Param | Type | Required |
|---|---|---|
| `matchday` | int | No |

**200 (matchday):** `{ matchday, breakdown: [{ player_id, player_name, position, score }] }`.  
**200 (cumulative):** `{ by_matchday: [{ matchday, score }] }`.  
**401:** Không có token. **404:** Chưa có squad hoặc stats cho matchday.

---

## 8. Scoring Formula (v1)

Được gọi bởi `POST /playerstats`. Swap-able sang v2 không ảnh hưởng endpoints (GR-09).

| Event | FWD/MID | DEF/GK |
|---|---|---|
| Goal | +5 | +6 |
| Assist | +3 | +3 |
| Clean sheet | — | +4 |
| ≥ 60 min | +2 | +2 |
| < 60 min | +1 | +1 |
| Yellow | -1 | -1 |
| Red | -3 | -3 |

---

## 9. Current User

### GET `/me`
Profile của authenticated user. Dùng để verify session và lấy `role` cho frontend.

**Auth:** Bearer token.

**200:** `{ user_id, username, display_name, role }`. **401:** Không có token.

---

## 10. Leaderboard

### GET `/leaderboard`
Bảng xếp hạng tổng điểm hoặc theo matchday. Shared authenticated route — bất kỳ user active nào đều xem được.

**Auth:** Bearer token.

| Param | Type | Required | Description |
|---|---|---|---|
| `matchday` | int | No | Lọc theo một matchday; nếu omit thì cumulative |

**200 (cumulative):**
```json
{
  "entries": [
    { "rank": 1, "user_id": 17, "username": "markiengo", "display_name": "Mark", "score": 128 }
  ],
  "my_user_id": 17
}
```

**200 (matchday):**
```json
{
  "matchday": 3,
  "entries": [
    { "rank": 1, "user_id": 24, "username": "demo_brazil_fan", "display_name": "Demo Brazil Fan", "score": 31 }
  ],
  "my_user_id": 17
}
```

**200 (empty):** `{ "entries": [], "my_user_id": 17 }`

Ranking: sort by score DESC, tie-break by `user_id` ASC. Ranks sequential (1, 2, 3, ...) — tied scores không chia rank.

**401:** Không có token.

---

## 11. Error Codes

| HTTP | Ý nghĩa |
|---|---|
| `200` | Thành công |
| `201` | Tạo mới thành công |
| `400` | Validation fail hoặc business rule vi phạm |
| `401` | Unauthorized — token thiếu/không hợp lệ |
| `403` | Forbidden — không được phép |
| `404` | Resource không tồn tại |
| `500` | Server error |
