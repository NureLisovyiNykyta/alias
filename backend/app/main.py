from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.handlers import setup_exception_handlers
from app.api.v1.auth import router as auth_router
from app.api.v1.card_packs import router as card_packs_router
from app.api.v1.cards import router as cards_router
from app.api.v1.map_fields import router as map_fields_router
from app.api.v1.maps import router as maps_router
from app.api.v1.users import router as users_router
from app.core.config import settings

app = FastAPI(title="Alias API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_exception_handlers(app)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(card_packs_router)
app.include_router(cards_router)
app.include_router(maps_router)
app.include_router(map_fields_router)
