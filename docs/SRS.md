# SRS - World Cup Fantasy Football 2026
**Version:** 2.0  
**Author:** Tân  
**Last Updated:** 2026-06-09

---

## 1. Introduction

### 1.1 Project Overview
Một web application cho phép user xây dựng đội hình 11 cầu thủ trong giới hạn budget cố định, tích điểm mỗi matchday dựa theo thành tích thực tế của cầu thủ, và có thể thực hiện tối đa 5 transfer giữa các vòng đấu theo quy tắc budget cụ thể.

### 1.2 System Scope
- Web application (browser-based)
- Backend: FastAPI + Supabase (PostgreSQL) + psycopg2 (raw SQL)
- Frontend: Vanilla HTML/CSS/JS
- Single user (không có multiplayer ở v1)
- Match stats lấy từ third-party API hoặc web scraping (deferred)

### 1.3 Assumptions
- Dữ liệu cầu thủ và giá được seed thủ công hoặc qua API (TBD)
- Match stats được nhập sau mỗi matchday thực tế (phương thức TBD)
- Scoring algorithm dùng standard fantasy points ở v1
- Không cần authentication ở v1 (single user)

### 1.4 Out of Scope
- Multiplayer / leaderboard
- Real-time live score updates
- Biến động giá cầu thủ
- Captain / vice-captain multiplier
- Các biến, multiplier phức tạp hơn để tính điểm (deferred to v2)

---

## 2. Use Cases

| ID    | Actor  | Use Case              | Description                                                  |
| -------| --------| -----------------------| --------------------------------------------------------------|
| UC-01 | User   | View player list      | User xem danh sách cầu thủ, lọc theo vị trí, đội, giá        |
| UC-02 | User   | Build squad           | User pick 11 cầu thủ tạo đội hình trong budget               |
| UC-03 | User   | View current squad    | User xem đội hình hiện tại với giá và vị trí                 |
| UC-04 | User   | Make transfer         | User bán 1 cầu thủ, mua 1 cầu thủ khác trong transfer window |
| UC-05 | User   | View transfer history | User xem lịch sử transfer theo matchday                      |
| UC-06 | User   | View fixtures         | User xem lịch thi đấu vòng hiện tại và sắp tới               |
| UC-07 | User   | View matchday score   | User xem điểm của đội hình theo từng matchday                |
| UC-08 | User   | View score breakdown  | User xem điểm đóng góp của từng cầu thủ mỗi vòng             |
| UC-09 | User   | View points chart     | User xem biểu đồ điểm tích lũy qua các vòng                  |
| UC-10 | User   | View budget           | User xem budget còn lại và số transfer còn lại               |
| UC-11 | System | Calculate score       | System tính điểm tự động sau khi stats được nhập vào DB      |
| UC-12 | System | Lock transfers        | System khóa transfer khi trận đầu tiên của matchday bắt đầu  |
| UC-13 | System | Validate squad        | System validate formation, budget, team limit trước khi lưu  |

---

## 3. Functional Requirements

### 3.1 Squad Management

| ID | Yêu cầu | Use Case |
|---|---|---|
| FR-01 | User xem được danh sách tất cả cầu thủ, lọc theo vị trí, đội, và giá | UC-01 |
| FR-02 | User pick 11 cầu thủ để tạo đội hình trước từng vòng đấu | UC-02 |
| FR-03 | Đội hình phải tuân theo formation: 4-3-3 hoặc 4-4-2 (1 GK, 4 DEF, 3/4 MID, 3/2 FWD) | UC-02, UC-13 |
| FR-04 | Tổng giá đội hình không được vượt quá budget cố định ($50M) | UC-02, UC-13 |
| FR-05 | Không được pick quá 3 cầu thủ từ cùng một đội tuyển quốc gia | UC-02, UC-13 |
| FR-06 | User xem được đội hình hiện tại với giá và vị trí từng cầu thủ | UC-03 |

### 3.2 Transfers

| ID    | Yêu cầu                                                                | Use Case |
| -------| ------------------------------------------------------------------------| ----------|
| FR-07 | User thực hiện tối đa 5 transfer mỗi matchday window                   | UC-04    |
| FR-08 | Khi bán cầu thủ, giá bán được cộng lại vào budget                      | UC-04    |
| FR-09 | Khi mua cầu thủ, giá mua bị trừ khỏi budget                            | UC-04    |
| FR-10 | Transfer bị khóa khi trận đầu tiên của matchday bắt đầu                | UC-12    |
| FR-11 | Transfer chưa dùng không được tích lũy sang vòng tiếp theo             | UC-04    |
| FR-12 | User xem được số transfer còn lại và budget hiện tại trước khi confirm | UC-10    |

### 3.3 Scoring

| ID    | Yêu cầu                                                                     | Use Case |
| -------| -----------------------------------------------------------------------------| ----------|
| FR-13 | Hệ thống tính điểm cho từng cầu thủ sau mỗi matchday dựa theo stats thực tế | UC-11    |
| FR-14 | Bảng điểm mặc định (v1, subject to change):                                 | UC-11    |
|       | - Ghi bàn (FWD/MID): +5 điểm                                                |          |
|       | - Ghi bàn (DEF/GK): +6 điểm                                                 |          |
|       | - Kiến tạo: +3 điểm                                                         |          |
|       | - Clean sheet (GK/DEF): +4 điểm                                             |          |
|       | - Thẻ vàng: -1 điểm                                                         |          |
|       | - Thẻ đỏ: -3 điểm                                                           |          |
|       | - Thi đấu ≥ 60 phút: +2 điểm                                                |          |
|       | - Thi đấu < 60 phút: +1 điểm                                                |          |
| FR-15 | Điểm matchday = tổng điểm của 11 cầu thủ trong đội hình                     | UC-07    |
| FR-16 | Tổng điểm tích lũy = tổng điểm của tất cả các matchday                      | UC-07    |
| FR-17 | Scoring algorithm có thể được thay thế mà không ảnh hưởng phần còn lại      | UC-11    |

### 3.4 Stats & Reporting

| ID | Yêu cầu | Use Case |
|---|---|---|
| FR-18 | User xem được tổng điểm và điểm breakdown theo từng matchday | UC-07, UC-08 |
| FR-19 | User xem được biểu đồ điểm theo các vòng đấu | UC-09 |
| FR-20 | User xem được điểm đóng góp của từng cầu thủ mỗi vòng | UC-08 |
| FR-21 | User xem được budget còn lại | UC-10 |

### 3.5 Fixtures Display

| ID    | Yêu cầu                                                        | Use Case |
| -------| ----------------------------------------------------------------| ----------|
| FR-22 | User xem được lịch thi đấu của vòng đấu hiện tại và sắp tới    | UC-06    |
| FR-23 | Fixtures hiển thị: hai đội, ngày giờ thi đấu, nhãn group stage | UC-06    |

### 3.6 Data Pipeline

| ID | Yêu cầu |
|---|---|
| FR-24 | Dữ liệu cầu thủ (tên, vị trí, đội, giá) được seed trực tiếp vào database |
| FR-25 | Dữ liệu trận đấu (hai đội, matchday, giai đoạn) được seed trực tiếp vào database |
| FR-26 | Match stats sau mỗi vòng được nhập vào database (bằng thủ công, mock data, script ESPN API, hoặc bulk endpoint cho machine-level loading) |
| FR-27 | Hệ thống lưu raw stats của từng cầu thủ mỗi trận riêng biệt với điểm đã tính |

---

## 4. Game Rules

| ID    | Quy tắc                                                                                         |
| -------| -------------------------------------------------------------------------------------------------|
| GR-01 | Budget khởi đầu cố định: $50M                                                                   |
| GR-02 | Đội hình gồm đúng 11 cầu thủ                                                                    |
| GR-03 | Formation: 4-3-3 hoặc 4-4-2 (1 GK, 4 DEF, 3/4 MID, 3/2 FWD)                                     |
| GR-04 | Tối đa 3 cầu thủ từ cùng một đội tuyển quốc gia                                                 |
| GR-05 | Tối đa 5 transfer mỗi matchday window                                                           |
| GR-06 | Giá cầu thủ không thay đổi trong v1 — giá bán = giá mua                                         |
| GR-07 | Transfer bị khóa khi trận đầu tiên của matchday bắt đầu                                         |
| GR-08 | Điểm chỉ được tính sau khi stats cho matchday đó được nhập vào database                         |
| GR-09 | Scoring formula được version-control và có thể swap (v1 = standard, v2 = opponent-adjusted TBD) |

---

## 5. Data Design

### 5.1 ER Diagram

![ERD](ERD.png)

### 5.2 Database Schema

![DB Design](DBdesign.jpg)

### 5.3 Entities

| Entity | Key Attributes |
|---|---|
| **users** | user_id, username, created_at |
| **team** | team_id, name, fifa_ranking, elo_rating, group_stage |
| **player** | player_id, name, position, team_id, base_price |
| **match** | match_id, team1_id, team2_id, matchday, stage, date, team1_score, team2_score |
| **playerstat** | stat_id, player_id, match_id, goals, assists, minutes_played, yellow_cards, score (derived) |
| **squad** | squad_id, user_id, matchday, budget_used, created_at |
| **squadplayer** | squadplayer_id, squad_id, player_id |
| **transfers** | transfer_id, user_id, player_in_id, player_out_id, matchday |

### 5.4 Key Relationships

- `users` 1:N `squad` — một user có nhiều squad (một per matchday)
- `squad` 1:N `squadplayer` — một squad có đúng 11 squadplayer
- `player` 1:N `squadplayer` — một player có thể xuất hiện trong nhiều squad
- `player` 1:N `playerstat` — một player có nhiều stat rows (một per trận)
- `match` 1:N `playerstat` — một trận generates nhiều player stats
- `users` 1:N `transfers` — một user có nhiều transfer records
- `team` 1:N `player` — một team có nhiều player

### 5.5 Key Constraints

- `UNIQUE (user_id, matchday)` trên `squad` — một squad per user per matchday
- `UNIQUE (player_id, match_id)` trên `playerstat` — một stat row per player per match
- `UNIQUE (squad_id, player_id)` trên `squadplayer` — không trùng player trong cùng squad
- `CHECK (position IN ('GK', 'DEF', 'MID', 'FWD'))` trên `player`

---

## 6. Tech Stack

### 6.1 Stack Overview

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | Supabase (hosted PostgreSQL) |
| DB Driver | psycopg2 (raw SQL) |
| Frontend | Vanilla HTML / CSS / JS |

### 6.2 Python Libraries

| Library | Version | Purpose |
|---|---|---|
| `fastapi` | latest | Web framework, định nghĩa API endpoints |
| `uvicorn` | latest | ASGI server để chạy FastAPI app |
| `psycopg2-binary` | latest | PostgreSQL driver, kết nối và chạy raw SQL |
| `python-dotenv` | latest | Load Supabase credentials từ `.env` file |
| `pydantic` | v2 | Request/response validation (built into FastAPI) |

### 6.3 Project Structure

```
fantasy-wc/
├── app/
│   ├── main.py         # FastAPI entry point
│   ├── routers/        # API route handlers (players, squad, transfers, scoring)
│   ├── crud/           # Raw SQL query functions
│   └── database.py     # Supabase connection setup
├── static/             # HTML/CSS/JS frontend
├── .env                # Supabase credentials (never commit)
├── requirements.txt
└── docs/
```

## 7. Glossary

| Term | Definition |
|---|---|
| Matchday | Một vòng đấu trong World Cup, bao gồm nhiều trận diễn ra trong cùng một period |
| Squad | Đội hình 11 cầu thủ của user cho một matchday cụ thể |
| Transfer | Hành động bán một cầu thủ và mua một cầu thủ khác trong transfer window |
| Transfer window | Khoảng thời gian giữa hai matchday khi user được phép thay đổi đội hình |
| Budget | Số tiền ảo user dùng để mua cầu thủ, mặc định $50M |
| Score | Điểm tích lũy của một cầu thủ trong một trận, tính bởi scoring engine |
| Scoring engine | Module tính điểm dựa trên raw stats của cầu thủ sau mỗi matchday |
| Seed | Nhập dữ liệu ban đầu vào database (cầu thủ, đội, lịch thi đấu) |
| Stage | Giai đoạn của giải đấu: Group Stage, Round of 32, Round of 16, QF, SF, Final |
| raw SQL | Viết câu lệnh SQL trực tiếp trong Python thay vì dùng ORM |

