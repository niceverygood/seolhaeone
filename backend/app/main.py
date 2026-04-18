from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import ai, auth, customers, dashboard, golf, public, resort
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME, docs_url="/docs", openapi_url="/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
for r in (auth.router, dashboard.router, golf.router, resort.router, customers.router, ai.router, public.router):
    app.include_router(r, prefix=settings.API_V1_PREFIX)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.PROJECT_NAME}
