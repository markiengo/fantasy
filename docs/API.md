# API Specification
**Version:** 2.3  
**Last Updated:** 2026-06-16

---

## Base Path

Tất cả endpoint đều được mount dưới prefix **`/api`** (ví dụ thực tế: `GET /api/players`).  
Để gọn, các path trong tài liệu dưới đây lược bỏ prefix `/api`.

---

## Response Format

Mọi response thành công trả về JSON object hoặc JSON array tùy endpoint.  
Mọi lỗi trả về `{ "detail": "Mô tả lỗi" }`.

---

## 1. Players

### GET `/players`
Lấy danh sách tất cả cầu thủ. Hỗ trợ filter theo vị trí, đội, giá (UC-01, FR-01).

**Query Parameters:**

| Param       | Type   | Required | Description                                              |
| -------------| --------| ----------| ----------------------------------------------------------|
| `name`      | string | No       | Tìm theo tên (khớp một phần, không phân biệt hoa thường) |
| `position`  | string | No       | `GK`, `DEF`, `MID`, `FWD`                                |
| `team_id`   | string | No       | FIFA 3-letter code (e.g. `BRA`, `ENG`)                   |
| `max_price` | float  | No       | Giá tối đa (triệu $)                                     |

**Response `200`:** Array of player objects — player_id, name, position, team_id, team_name, base_price.

---

### GET `/players/{player_id}`
Lấy thông tin chi tiết một cầu thủ (UC-01).

**Path Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `player_id` | int | Yes | ID của cầu thủ |

**Response `200`:** Single player object — player_id, name, position, team_id, team_name, base_price.  
**Response `404`:** Player không tồn tại.

---

## 2. Teams

### GET `/teams`
Lấy danh sách tất cả đội tuyển tham dự World Cup 2026 (UC-06, FR-23).

**Response `200`:** Array of team objects — team_id, name, fifa_ranking, elo_rating, group_stage.

---

## 3. Matches

### GET `/matches`
Lấy lịch thi đấu. Hỗ trợ filter theo matchday hoặc stage (UC-06, FR-22, FR-23).

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `matchday` | int | No | Số vòng đấu |
| `stage` | string | No | `group_stage`, `round_of_32`, `round_of_16`, `quarter_final`, `semi_final`, `final` |

**Response `200`:** Array of match objects — match_id, team1_id, team1_name, team2_id, team2_name, matchday, stage, date, team1_score, team2_score.

---

### GET `/matches/{match_id}`
Lấy chi tiết một trận đấu kèm player stats nếu đã có (FR-27).

**Path Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `match_id` | int | Yes | ID của trận đấu |

**Response `200`:** Single match object kèm `stats` array — match_id, team1_id, team1_name, team2_id, team2_name, matchday, stage, date, team1_score, team2_score, stats array (stat_id, player_id, player_name, goals, assists, minutes_played, yellow_cards, red_cards, clean_sheet, score).  
**Response `404`:** Match không tồn tại.

---

## 4. Squad

### GET `/squad`
Lấy đội hình của user cho một matchday cụ thể (UC-03, FR-06).

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `matchday` | int | Yes | Số vòng đấu |

**Response `200`:** Squad object — squad_id, matchday, budget_used, budget_remaining (derived: 50 - budget_used), players array (player_id, name, position, team_id, team_name, base_price).  
**Response `404`:** Squad chưa được tạo cho matchday này.

---

### POST `/squad`
Tạo đội hình mới cho một matchday. INSERT vào cả `squad` và `squadplayer` (11 rows). Validate formation, budget, team limit (UC-02, UC-13, FR-02 → FR-05, GR-01 → GR-04).

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `matchday` | int | Yes | Số vòng đấu |
| `player_ids` | int[] | Yes | Đúng 11 player_id |

**Response `201`:** Squad object sau khi tạo — squad_id, matchday, budget_used, budget_remaining, players array.  
**Response `400`:** Squad đã tồn tại cho matchday này (vi phạm UNIQUE user_id + matchday), hoặc vi phạm squad rules (size, formation, nation limit, budget).  
**Response `404`:** Một trong các `player_id` không tồn tại.

---

## 5. Transfers

### GET `/transfers`
Lấy lịch sử transfer của user (UC-05, FR-11).

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `matchday` | int | No | Filter theo vòng đấu |

**Response `200`:** Array of transfer objects — transfer_id, player_in_id, player_in_name, player_out_id, player_out_name, matchday.

---

### POST `/transfer`
Thực hiện một transfer. Đây là entry point duy nhất cho toàn bộ transfer logic — INSERT vào `transfers`, DELETE + INSERT vào `squadplayer`, UPDATE `budget_used` trên `squad` (UC-04, FR-07 → FR-12, GR-05 → GR-07).

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `player_in_id` | int | Yes | Cầu thủ mua vào |
| `player_out_id` | int | Yes | Cầu thủ bán ra |
| `matchday` | int | Yes | Vòng đấu đang thực hiện transfer |

**Response `201`:** Transfer object — transfer_id, player_in_id, player_in_name, player_out_id, player_out_name, matchday, transfers_used, transfers_remaining, budget_remaining.  
**Response `400`:** Đã dùng hết 5 transfers (GR-05), transfer window đã đóng (GR-07), `player_out_id` không có trong squad hiện tại, hoặc squad sau swap vi phạm squad rules.  
**Response `404`:** `player_in_id`, `player_out_id`, hoặc squad của matchday không tồn tại.

---

## 6. Player Stats

### GET `/playerstats`
Lấy stats của các cầu thủ. Filter theo match hoặc player (FR-20, FR-27).

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `match_id` | int | No | Filter theo trận đấu |
| `player_id` | int | No | Filter theo cầu thủ |

**Response `200`:** Array of stat objects — stat_id, player_id, player_name, match_id, goals, assists, minutes_played, yellow_cards, red_cards, clean_sheet, score.

---

### POST `/playerstats`
Nhập stats cho một cầu thủ trong một trận. Trigger scoring engine tính và lưu điểm vào `playerstat.score` (UC-11, FR-13, FR-14, FR-26, GR-08, GR-09).

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `player_id` | int | Yes | ID cầu thủ |
| `match_id` | int | Yes | ID trận đấu |
| `goals` | int | Yes | Số bàn thắng |
| `assists` | int | Yes | Số kiến tạo |
| `minutes_played` | int | Yes | Số phút thi đấu |
| `yellow_cards` | int | Yes | Số thẻ vàng |
| `red_cards` | int | Yes | Số thẻ đỏ (0 hoặc 1) |
| `clean_sheet` | int | Yes | Clean sheet (0 hoặc 1, chỉ có nghĩa với DEF/GK) |

**Response `201`:** Stat object với score đã được tính — stat_id, player_id, match_id, goals, assists, minutes_played, yellow_cards, red_cards, clean_sheet, score.  
**Response `400`:** Stat row đã tồn tại cho player + match này (UNIQUE constraint vi phạm), hoặc đội của player không thi đấu trong trận này.  
**Response `404`:** Player hoặc match không tồn tại.

---

### POST `/playerstats/bulk`
Bulk insert player stats. Machine-level endpoint for scripts only (e.g., ESPN data loading). Bypasses individual HTTP requests for performance, but still validates player/match existence and team participation (FR-26).

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `stats` | PlayerStatCreate[] | Yes | Array of player stat objects (same structure as single POST) |

**Response `201`:** Object with summary — inserted count, errors count, results array (successful inserts), errors_detail array (failed inserts with error messages).  
**Response `400`:** Validation errors for individual stats (returned in errors_detail, not as HTTP error).

> ⚠️ **Machine-level only:** This endpoint is designed for automated scripts (e.g., `tools/load_stats.py`). It processes multiple stats in a single request and returns partial success/failure rather than failing the entire batch on individual errors.

---

## 7. Scoring

### GET `/score`
Lấy điểm của squad user. Nếu truyền `matchday` → trả về điểm + breakdown của vòng đó. Nếu không → trả về tổng điểm tích lũy (UC-07, UC-08, UC-09, FR-15, FR-16, FR-18, FR-19, GR-08).

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `matchday` | int | No | Nếu không truyền, trả về cumulative score |

**Response `200` — single matchday:** Object gồm matchday, breakdown array (player_id, player_name, position, score).  
**Response `200` — cumulative:** Object gồm by_matchday array (matchday, score).
**Response `404`:** Squad chưa có hoặc stats chưa được nhập cho matchday này.

---

## 8. Scoring Formula (v1)

Module tính điểm được gọi bởi `POST /playerstats`. Swap-able sang v2 mà không ảnh hưởng các endpoint khác (GR-09, FR-17).

| Sự kiện | FWD/MID | DEF/GK |
|---|---|---|
| Ghi bàn | +5 | +6 |
| Kiến tạo | +3 | +3 |
| Clean sheet | — | +4 |
| Thi đấu ≥ 60 phút | +2 | +2 |
| Thi đấu < 60 phút | +1 | +1 |
| Thẻ vàng | -1 | -1 |
| Thẻ đỏ | -3 | -3 |

---

## 9. Error Codes Summary

| HTTP Code | Ý nghĩa |
|---|---|
| `200` | Thành công |
| `201` | Tạo mới thành công |
| `400` | Bad request — validation fail, business rule vi phạm |
| `404`| Resource không tồn tại |
| `500` | Server error |