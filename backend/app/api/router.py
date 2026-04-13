from fastapi import APIRouter

from app.api.routes import agent, auth, dashboard, datasets, lab, runs


api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(agent.router, prefix="/agent", tags=["agent"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(runs.router, prefix="/runs", tags=["runs"])
api_router.include_router(lab.router, prefix="/lab", tags=["lab"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
