"""
FastAPI Application for All 3 ML Models
Provides endpoints for:
- Model 1: Demand Prediction
- Model 2: Fair Price Prediction
- Model 3: Crop Recommendation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import uvicorn
import sys
from pathlib import Path

# Add models directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import model services
from model1_service import Model1Service
from model2_service import Model2Service
from model3_service import Model3Service

# ============================================================================
# FASTAPI APP SETUP
# ============================================================================

app = FastAPI(
    title="Agriflow ML Models API",
    description="API for agricultural prediction and recommendation models",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models
model1_service = None
model2_service = None
model3_service = None

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class Model1PredictRequest(BaseModel):
    """Request model for Model 1 (Demand Prediction)"""
    item: str = Field(..., description="Crop name")
    year: Optional[int] = Field(2026, description="Year for prediction")
    food_supply: Optional[float] = Field(None, description="Food supply quantity (kg/capita/yr)")

class Model2PredictRequest(BaseModel):
    """Request model for Model 2 (Fair Price Prediction)"""
    item: str = Field(..., description="Crop name")
    year: Optional[int] = Field(2026, description="Year for prediction")
    export_quantity: Optional[float] = Field(None, description="Export quantity in tonnes")
    import_quantity: Optional[float] = Field(None, description="Import quantity in tonnes")
    gdp: Optional[float] = Field(None, description="GDP per capita value")

class Model3RecommendRequest(BaseModel):
    """Request model for Model 3 (Crop Recommendation)"""
    season: str = Field(..., description="Growing season")
    soil_type: str = Field(..., description="Type of soil")
    region: str = Field(..., description="Geographic region")

# ============================================================================
# STARTUP/SHUTDOWN EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    global model1_service, model2_service, model3_service
    
    print("[FastAPI] Starting up...")
    print("[Model1] Initializing Demand Prediction Service...")
    model1_service = Model1Service()
    print(f"  ✓ Model 1 ready with {len(model1_service.get_available_crops())} crops")
    
    print("[Model2] Initializing Fair Price Prediction Service...")
    model2_service = Model2Service()
    print(f"  ✓ Model 2 ready with {len(model2_service.get_available_crops())} crops")
    
    print("[Model3] Initializing Crop Recommendation Service...")
    model3_service = Model3Service()
    print(f"  ✓ Model 3 ready")
    
    print("[FastAPI] All models initialized successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("[FastAPI] Shutting down...")

# ============================================================================
# HEALTH & INFO ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Check if all models are loaded and healthy"""
    return {
        "status": "healthy",
        "models": {
            "model1": "ready" if model1_service else "not ready",
            "model2": "ready" if model2_service else "not ready",
            "model3": "ready" if model3_service else "not ready",
        }
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Agriflow ML Models API",
        "version": "1.0.0",
        "endpoints": {
            "model1": {
                "description": "Demand Prediction",
                "crops": "/model1/crops",
                "predict": "/model1/predict"
            },
            "model2": {
                "description": "Fair Price Prediction",
                "crops": "/model2/crops",
                "predict": "/model2/predict"
            },
            "model3": {
                "description": "Crop Recommendation",
                "options": "/model3/options",
                "recommend": "/model3/recommend",
                "crop_details": "/model3/crop/{crop_name}"
            },
            "health": "/health"
        }
    }

# ============================================================================
# MODEL 1: DEMAND PREDICTION ENDPOINTS
# ============================================================================

@app.get("/model1/crops")
async def get_model1_crops():
    """Get available crops for Model 1"""
    if not model1_service:
        raise HTTPException(status_code=503, detail="Model 1 not initialized")
    
    return {
        "success": True,
        "crops": model1_service.get_available_crops()
    }

@app.post("/model1/predict")
async def predict_demand(request: Model1PredictRequest):
    """
    Predict demand for a crop using Model 1
    
    Example request:
    {
        "item": "Wheat and products",
        "year": 2026,
        "food_supply": null
    }
    """
    if not model1_service:
        raise HTTPException(status_code=503, detail="Model 1 not initialized")
    
    try:
        result = model1_service.predict(
            item=request.item,
            year=request.year,
            food_supply=request.food_supply
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# MODEL 2: FAIR PRICE PREDICTION ENDPOINTS
# ============================================================================

@app.get("/model2/crops")
async def get_model2_crops():
    """Get available crops for Model 2"""
    if not model2_service:
        raise HTTPException(status_code=503, detail="Model 2 not initialized")
    
    return {
        "success": True,
        "crops": model2_service.get_available_crops()
    }

@app.post("/model2/predict")
async def predict_price(request: Model2PredictRequest):
    """
    Predict fair price for a crop using Model 2
    
    Example request:
    {
        "item": "Wheat and products",
        "year": 2026,
        "export_quantity": null,
        "import_quantity": null,
        "gdp": null
    }
    """
    if not model2_service:
        raise HTTPException(status_code=503, detail="Model 2 not initialized")
    
    try:
        result = model2_service.predict(
            item=request.item,
            year=request.year,
            export_quantity=request.export_quantity,
            import_quantity=request.import_quantity,
            gdp=request.gdp
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# MODEL 3: CROP RECOMMENDATION ENDPOINTS
# ============================================================================

@app.get("/model3/options")
async def get_model3_options():
    """Get available options for Model 3 (seasons, soil types, regions)"""
    if not model3_service:
        raise HTTPException(status_code=503, detail="Model 3 not initialized")
    
    return {
        "success": True,
        "seasons": model3_service.get_seasons(),
        "soil_types": model3_service.get_soil_types(),
        "regions": model3_service.get_regions()
    }

@app.post("/model3/recommend")
async def recommend_crops(request: Model3RecommendRequest):
    """
    Get crop recommendations based on environmental conditions
    
    Example request:
    {
        "season": "Kharif",
        "soil_type": "Loamy",
        "region": "North"
    }
    """
    if not model3_service:
        raise HTTPException(status_code=503, detail="Model 3 not initialized")
    
    try:
        result = model3_service.recommend_crops(
            season=request.season,
            soil_type=request.soil_type,
            region=request.region
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model3/crop/{crop_name}")
async def get_crop_details(crop_name: str):
    """Get detailed information about a specific crop"""
    if not model3_service:
        raise HTTPException(status_code=503, detail="Model 3 not initialized")
    
    try:
        result = model3_service.get_crop_details(crop_name)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# RUN SERVER
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
