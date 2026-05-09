from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.controller import prediction_controller, model_registry_controller, training_controller, dashboard_controller, admin_controller
from api.database.session import engine
from api.database.model import Base

# Create db tables on startup (since no auth/alembic asked for demo)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RetainAI System API",
    description="Backend API for customer churn prediction and model registry management",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_controller.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(prediction_controller.router, prefix="/api/v1/predictions", tags=["Predictions"])
app.include_router(model_registry_controller.router, prefix="/api/v1/model-registry", tags=["Model Registry"])
app.include_router(training_controller.router, prefix="/api/v1/training", tags=["Training Pipeline"])
app.include_router(admin_controller.router, prefix="/api/v1/admin", tags=["Admin"])

@app.get("/")
def root():
    return {"message": "Welcome to RetainAI API"}
