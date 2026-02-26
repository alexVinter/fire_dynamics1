import logging
import os

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.admin_users import router as admin_users_router
from app.routes.auth import router as auth_router
from app.routes.quotes import router as quotes_router
from app.routes.rules import router as rules_router
from app.routes.skus import router as skus_router
from app.routes.technique_aliases import router as technique_aliases_router
from app.routes.techniques import router as techniques_router
from app.routes.zones import router as zones_router

app = FastAPI(title="Fire Dynamics API")

_cors_env = os.environ.get("CORS_ORIGINS", "")
_cors_origins = (
    [o.strip() for o in _cors_env.split(",") if o.strip()]
    if _cors_env
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_users_router)
app.include_router(techniques_router)
app.include_router(technique_aliases_router)
app.include_router(zones_router)
app.include_router(skus_router)
app.include_router(rules_router)
app.include_router(quotes_router)


@app.get("/health")
def health() -> dict:
    return {"ok": True}
