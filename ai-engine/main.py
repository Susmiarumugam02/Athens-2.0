from fastapi import FastAPI
from routes.prediction import router as prediction_router
from routes.training import router as training_router

app = FastAPI(
    title="Athens AI Engine",
    version="1.0.0",
    description="Predictive industrial safety ML runtime for Athens 2.0",
)

app.include_router(prediction_router, prefix="/prediction", tags=["prediction"])
app.include_router(training_router, prefix="/training", tags=["training"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "athens-ai-engine"}
