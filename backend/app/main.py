from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.db.base import metadata
from app.db.session import get_engine, get_session_factory
from app.services.run_executor import RunExecutor
from app.services.seed import seed_base_data
from app.services.tooling import prepare_tool_schema


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    engine = get_engine()
    metadata.create_all(bind=engine)
    prepare_tool_schema(engine)
    session = get_session_factory()()
    try:
        seed_base_data(session)
        RunExecutor.recover_stuck_runs(session)
        yield
    finally:
        session.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    messages: list[str] = []
    for error in exc.errors():
        location = ".".join(str(part) for part in error.get("loc", [])[1:]) or "request"
        messages.append(f"{location}: {error.get('msg', 'Invalid value')}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "; ".join(messages) or "Request validation failed.",
            "errors": exc.errors(),
        },
    )


def _dist_file(path: str) -> Path:
    return settings.frontend_dist_path / path


@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa(full_path: str) -> FileResponse:
    if not settings.frontend_dist_path.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found.")

    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found.")

    requested = _dist_file(full_path)
    if requested.exists() and requested.is_file():
        return FileResponse(requested)

    return FileResponse(_dist_file("index.html"))
