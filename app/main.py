# create the fastapi instance
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import player
from app.routers import match
from app.routers import playerstat
from app.routers import score
from app.routers import squad
from app.routers import team
from app.routers import transfer
from app.core.validation import SquadValidationError
from fastapi.responses import JSONResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # Frontend is served via simple static servers during dev; allow common localhost ports.
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(player.router, prefix = "/api")
app.include_router(match.router, prefix = "/api")
app.include_router(playerstat.router, prefix = "/api")
app.include_router(score.router, prefix = "/api")
app.include_router(squad.router, prefix = "/api")
app.include_router(team.router, prefix = "/api")
app.include_router(transfer.router, prefix = "/api")


@app.get("/")
def root():
    return {"message": "Welcome to the Fantasy World Cup API"}

@app.exception_handler(SquadValidationError)
async def validation_error_handler(request: Request, exc: SquadValidationError):
    return JSONResponse(status_code = 400, content = {"detail": str(exc)})
    
# registers routes
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

