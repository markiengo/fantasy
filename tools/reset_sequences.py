import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

tables = [
    ("squadplayer", "squadplayer_id", "squadplayer_squadplayer_id_seq"),
    ("squad", "squad_id", "squad_squad_id_seq"),
    ("transfers", "transfer_id", "transfers_transfer_id_seq"),
]

for table, col, seq in tables:
    cur.execute(f"SELECT setval('{seq}', (SELECT COALESCE(MAX({col}), 0) + 1 FROM {table}), false)")
    print(f"  {seq} -> nextval will be {cur.fetchone()[0]}")

conn.commit()
cur.close()
conn.close()
print("Sequences reset.")
