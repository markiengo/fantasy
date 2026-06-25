from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from app.routers import player
from app.routers import match
from app.routers import playerstat
from app.routers import score
from app.routers import squad
from app.routers import team
from app.routers import transfer
from app.routers import load_stats
from app.routers import me
from app.core.validation import SquadValidationError

app = FastAPI()

app.include_router(player.router, prefix = "/api")
app.include_router(match.router, prefix = "/api")
app.include_router(playerstat.router, prefix = "/api")
app.include_router(score.router, prefix = "/api")
app.include_router(squad.router, prefix = "/api")
app.include_router(team.router, prefix = "/api")
app.include_router(transfer.router, prefix = "/api")
app.include_router(load_stats.router, prefix = "/api")
app.include_router(me.router, prefix = "/api")

app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

@app.exception_handler(SquadValidationError)
async def validation_error_handler(request: Request, exc: SquadValidationError):
    return JSONResponse(status_code = 400, content = {"detail": str(exc)})

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    print(f"[500 ERROR] {request.method} {request.url.path}: {exc}\n{tb}")
    return JSONResponse(status_code=500, content={"detail": str(exc), "traceback": tb})

# registers routes
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
