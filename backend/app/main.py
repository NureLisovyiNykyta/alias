from fastapi import FastAPI

from app.api.handlers import setup_exception_handlers
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router

app = FastAPI(title="Alias API")

setup_exception_handlers(app)

app.include_router(auth_router)
app.include_router(users_router)
