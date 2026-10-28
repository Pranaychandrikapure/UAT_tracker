from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings


def get_engine_connect_args() -> dict:
    if "postgresql" in settings.database_url:
        schema = settings.database_schema or "tracker"
        return {"server_settings": {"search_path": schema}}
    if "sqlite" in settings.database_url:
        return {"check_same_thread": False}
    return {}


connect_args = get_engine_connect_args()
engine_kwargs = {"connect_args": connect_args}
if settings.environment == "test":
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(settings.database_url, **engine_kwargs)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session

