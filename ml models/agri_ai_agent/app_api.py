"""
FastAPI application for AgriFresh AI Agent
Provides endpoints for price prediction, demand prediction, and intelligent agent queries
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
from pathlib import Path

# Add parent directory to path to import models
sys.path.insert(0, str(Path(__file__).parent.parent))

from price_model import PriceModel
from demand_model import DemandModel
from agri_ai_agent.core.agent import AgriAgent
from agri_ai_agent.core.llm_engine import LLMEngine

# ============================================================================
# Pydantic Models (Request/Response Schemas)
# ============================================================================

class PriceRequest(BaseModel):
    """Request schema for price prediction"""
    crop: str
    features: list = None  # Optional: [crop_type, quantity, temp, humidity]
    
    class Config:
        example = {
            "crop": "wheat",
            "features": [1, 100, 25, 60]
        }

class PriceResponse(BaseModel):
    """Response schema for price prediction"""
    status: str
    crop: str
    price: float = None
    message: str = None

class DemandRequest(BaseModel):
    """Request schema for demand prediction"""
    crop: str
    features: list = None  # Optional: [crop_type, season, region, month]
    
    class Config:
        example = {
            "crop": "rice",
            "features": [2, 1, 3, 2]
        }

class DemandResponse(BaseModel):
    """Response schema for demand prediction"""
    status: str
    crop: str
    demand: float = None
    message: str = None

class CropRecommendationRequest(BaseModel):
    """Request schema for crop recommendation"""
    soil_type: str
    season: str
    region: str
    
    class Config:
        example = {
            "soil_type": "loamy",
            "season": "summer",
            "region": "maharashtra"
        }

class CropRecommendationResponse(BaseModel):
    """Response schema for crop recommendation"""
    status: str
    recommendation: str = None
    message: str = None

class AgentQuestion(BaseModel):
    """Request schema for agent queries"""
    question: str
    crop_features: list = None  # Optional features for ML models
    
    class Config:
        example = {
            "question": "What is the current price of wheat?",
            "crop_features": [1, 100, 25, 60]
        }

class AgentResponse(BaseModel):
    """Response schema for agent queries"""
    status: str
    route: str = None
    answer: str = None
    prediction: float = None
    message: str = None

# ============================================================================
# FastAPI Application
# ============================================================================

# Create FastAPI app
app = FastAPI(
    title="AgriFresh AI Agent API",
    description="API for agricultural predictions and AI-powered recommendations",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Global Variables (Models loaded at startup)
# ============================================================================

price_model = None
demand_model = None
llm_engine = None
agri_agent = None

# ============================================================================
# Startup and Shutdown Events
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Load all models at startup"""
    global price_model, demand_model, llm_engine, agri_agent
    
    print("🚀 Starting up AgriFresh AI Agent API...")
    
    try:
        print("📦 Loading PriceModel...")
        price_model = PriceModel()
    except Exception as e:
        print(f"⚠️  Error loading PriceModel: {e}")
    
    try:
        print("📦 Loading DemandModel...")
        demand_model = DemandModel()
    except Exception as e:
        print(f"⚠️  Error loading DemandModel: {e}")
    
    try:
        print("📦 Loading LLMEngine...")
        llm_engine = LLMEngine()
    except Exception as e:
        print(f"⚠️  Error loading LLMEngine: {e}")
        raise
    
    try:
        print("📦 Initializing AgriAgent...")
        agri_agent = AgriAgent(llm_engine)
        # Override the models in the agent with the globally loaded ones
        if price_model:
            agri_agent.price_model = price_model
        if demand_model:
            agri_agent.demand_model = demand_model
    except Exception as e:
        print(f"⚠️  Error initializing AgriAgent: {e}")
        raise
    
    print("✅ All models loaded successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("🛑 Shutting down AgriFresh AI Agent API...")

# ============================================================================
# Health Check Endpoint
# ============================================================================

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "message": "AgriFresh AI Agent API is running",
        "models_loaded": {
            "price_model": price_model is not None,
            "demand_model": demand_model is not None,
            "llm_engine": llm_engine is not None,
            "agri_agent": agri_agent is not None
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy" if all([price_model, demand_model, llm_engine, agri_agent]) else "degraded",
        "components": {
            "price_model": "loaded" if price_model else "failed",
            "demand_model": "loaded" if demand_model else "failed",
            "llm_engine": "loaded" if llm_engine else "failed",
            "agri_agent": "loaded" if agri_agent else "failed"
        }
    }

# ============================================================================
# Price Prediction Endpoint
# ============================================================================

@app.post("/predict-price", response_model=PriceResponse, tags=["Predictions"])
async def predict_price(request: PriceRequest):
    """
    Predict market price for a crop
    
    - **crop**: Name of the crop
    - **features**: Optional list of crop features [crop_type, quantity, temp, humidity]
    """
    if not price_model:
        raise HTTPException(status_code=503, detail="Price model not available")
    
    try:
        if request.features is None:
            return PriceResponse(
                status="error",
                crop=request.crop,
                message="Features required for price prediction"
            )
        
        predicted_price = price_model.predict([request.features])
        
        return PriceResponse(
            status="success",
            crop=request.crop,
            price=float(predicted_price),
            message=f"Predicted price for {request.crop}: ${predicted_price:.2f}"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error in price prediction: {str(e)}")

# ============================================================================
# Demand Prediction Endpoint
# ============================================================================

@app.post("/predict-demand", response_model=DemandResponse, tags=["Predictions"])
async def predict_demand(request: DemandRequest):
    """
    Predict demand for a crop
    
    - **crop**: Name of the crop
    - **features**: Optional list of crop features [crop_type, season, region, month]
    """
    if not demand_model:
        raise HTTPException(status_code=503, detail="Demand model not available")
    
    try:
        if request.features is None:
            return DemandResponse(
                status="error",
                crop=request.crop,
                message="Features required for demand prediction"
            )
        
        predicted_demand = demand_model.predict([request.features])
        
        return DemandResponse(
            status="success",
            crop=request.crop,
            demand=float(predicted_demand),
            message=f"Predicted demand for {request.crop}: {predicted_demand:.2f} units"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error in demand prediction: {str(e)}")

# ============================================================================
# Crop Recommendation Endpoint
# ============================================================================

@app.post("/predict-crop", response_model=CropRecommendationResponse, tags=["Recommendations"])
async def predict_crop(request: CropRecommendationRequest):
    """
    Get crop recommendation based on soil, season, and region
    
    - **soil_type**: Type of soil (loamy, clay, sandy, etc.)
    - **season**: Season (winter, summer, monsoon, etc.)
    - **region**: Geographic region
    """
    if not agri_agent:
        raise HTTPException(status_code=503, detail="AgriAgent not available")
    
    try:
        query = f"What crops would you recommend for {request.soil_type} soil in {request.season} season in {request.region}?"
        
        result = agri_agent.answer(query)
        
        if result.get('status') == 'success':
            recommendation = result.get('response') or result.get('message', '')
            return CropRecommendationResponse(
                status="success",
                recommendation=recommendation
            )
        else:
            raise Exception(result.get('message', 'Unknown error'))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error in crop recommendation: {str(e)}")

# ============================================================================
# Agent Query Endpoint
# ============================================================================

@app.post("/ask-agent", response_model=AgentResponse, tags=["Agent"])
async def ask_agent(request: AgentQuestion):
    """
    Ask the AI agent a question about agriculture
    
    The agent intelligently routes your question to:
    - PriceModel (if query contains keywords: price, cost, rate, etc.)
    - DemandModel (if query contains keywords: demand, supply, quantity, etc.)
    - LLMEngine (for general agricultural questions)
    
    - **question**: Your agricultural question
    - **crop_features**: Optional features for ML model predictions
    """
    if not agri_agent:
        raise HTTPException(status_code=503, detail="AgriAgent not available")
    
    try:
        result = agri_agent.answer(request.question, request.crop_features)
        
        route = result.get('route', 'unknown')
        status = result.get('status', 'error')
        
        if status == 'success':
            if route == 'price':
                return AgentResponse(
                    status="success",
                    route=route,
                    prediction=result.get('prediction'),
                    answer=result.get('message')
                )
            elif route == 'demand':
                return AgentResponse(
                    status="success",
                    route=route,
                    prediction=result.get('prediction'),
                    answer=result.get('message')
                )
            else:  # LLM
                return AgentResponse(
                    status="success",
                    route=route,
                    answer=result.get('response')
                )
        else:
            return AgentResponse(
                status="error",
                route=route,
                answer=result.get('message', 'An error occurred')
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error in agent query: {str(e)}")

# ============================================================================
# Run Instructions
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print("""
    ╔════════════════════════════════════════════════════════════════╗
    ║         AgriFresh AI Agent API - Starting Server              ║
    ║                                                                ║
    ║  To run the server with auto-reload, use:                    ║
    ║  uvicorn app_api:app --reload --host 0.0.0.0 --port 8000     ║
    ║                                                                ║
    ║  API Documentation: http://localhost:8000/docs                ║
    ║  Alternative Docs:  http://localhost:8000/redoc               ║
    ╚════════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "app_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
