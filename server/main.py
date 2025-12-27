from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
import datetime
from model_logic import model_instance

app = FastAPI(title="FinTech ML Fraud Detection Service")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TransactionDetails(BaseModel):
    amount: float
    description: str
    timestamp: float # ms since epoch
    category: str
    history: Optional[List[dict]] = []

class ScoreResponse(BaseModel):
    risk_score: int
    is_suspicious: bool
    reasons: List[str]
    confidence: float
    provider: str = "ML-Engine-v1"

@app.post("/score", response_model=ScoreResponse)
async def score_transaction(data: TransactionDetails):
    try:
        # Extract features
        dt = datetime.datetime.fromtimestamp(data.timestamp / 1000.0)
        hour = dt.hour
        
        # Get prediction from ML model
        result = model_instance.predict(data.amount, hour, data.category, data.history)
        
        return ScoreResponse(
            risk_score=result["risk_score"],
            is_suspicious=result["is_suspicious"],
            reasons=result["reasons"],
            confidence=result["confidence"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model_instance.trained}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
