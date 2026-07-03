import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parents[2]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from tools.demo_seed import seed_main


if __name__ == "__main__":
    raise SystemExit(seed_main())
