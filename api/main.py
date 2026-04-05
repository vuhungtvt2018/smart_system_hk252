from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.controller.prediction_controller import router as prediction_router
from api.database.session import engine
from api.database.model import Base

# Create db tables on startup (since no auth/alembic asked for demo)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RetainAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction_router, prefix="/api/v1/predictions", tags=["Predictions"])

@app.get("/")
def root():
    return {"message": "Welcome to RetainAI API"}
