import urllib.request, json

for md in [5, 6, 7, 8]:
    url = f"http://127.0.0.1:8000/api/matches?matchday={md}"
    try:
        data = json.loads(urllib.request.urlopen(url, timeout=5).read())
        print(f"\nMD{md}: {len(data)} matches")
        for m in data:
            t1 = m.get("team1_name") or "TBD"
            t2 = m.get("team2_name") or "TBD"
            print(f"  {m['match_id']}: {t1} vs {t2} - {m['stage']} - {m['date']} - kickoff={m.get('kickoff','N/A')}")
    except Exception as e:
        print(f"MD{md}: ERROR - {e}")
