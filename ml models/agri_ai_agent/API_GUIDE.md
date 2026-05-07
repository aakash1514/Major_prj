# AgriFresh AI Agent - FastAPI Guide

## Installation

1. **Install dependencies:**
```bash
cd c:\Agriflow\ml models\agri_ai_agent
pip install -r requirements_api.txt
```

## Running the Server

### Option 1: Direct Python Execution
```bash
cd c:\Agriflow\ml models\agri_ai_agent
python app_api.py
```

### Option 2: Using Uvicorn with Auto-Reload (Recommended for Development)
```bash
cd c:\Agriflow\ml models\agri_ai_agent
uvicorn app_api:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### 1. Health Check
```
GET http://localhost:8000/
GET http://localhost:8000/health
```

### 2. Predict Price
```bash
POST http://localhost:8000/predict-price

Request:
{
  "crop": "wheat",
  "features": [1, 100, 25, 60]
}

Response:
{
  "status": "success",
  "crop": "wheat",
  "price": 2450.75,
  "message": "Predicted price for wheat: $2450.75"
}
```

### 3. Predict Demand
```bash
POST http://localhost:8000/predict-demand

Request:
{
  "crop": "rice",
  "features": [2, 1, 3, 2]
}

Response:
{
  "status": "success",
  "crop": "rice",
  "demand": 5234.50,
  "message": "Predicted demand for rice: 5234.50 units"
}
```

### 4. Crop Recommendation
```bash
POST http://localhost:8000/predict-crop

Request:
{
  "soil_type": "loamy",
  "season": "summer",
  "region": "maharashtra"
}

Response:
{
  "status": "success",
  "recommendation": "For loamy soil in summer season in maharashtra, I recommend planting..."
}
```

### 5. Ask Agent
```bash
POST http://localhost:8000/ask-agent

Request:
{
  "question": "What is the current price of wheat?",
  "crop_features": [1, 100, 25, 60]
}

Response (Price Route):
{
  "status": "success",
  "route": "price",
  "prediction": 2450.75,
  "answer": "Predicted market price: $2450.75"
}

Response (Demand Route):
{
  "status": "success",
  "route": "demand",
  "prediction": 5234.50,
  "answer": "Predicted demand: 5234.50 units"
}

Response (LLM Route):
{
  "status": "success",
  "route": "llm",
  "answer": "Wheat is one of the most important staple crops..."
}
```

## Interactive Documentation

Once the server is running, access:
- **Swagger UI (Interactive)**: http://localhost:8000/docs
- **ReDoc (Alternative Docs)**: http://localhost:8000/redoc

## Testing with cURL

```bash
# Test health
curl http://localhost:8000/

# Test price prediction
curl -X POST http://localhost:8000/predict-price \
  -H "Content-Type: application/json" \
  -d '{"crop":"wheat","features":[1,100,25,60]}'

# Test demand prediction
curl -X POST http://localhost:8000/predict-demand \
  -H "Content-Type: application/json" \
  -d '{"crop":"rice","features":[2,1,3,2]}'

# Test agent query
curl -X POST http://localhost:8000/ask-agent \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the current price of wheat?","crop_features":[1,100,25,60]}'
```

## Key Features

✅ **Intelligent Routing**: Agent automatically routes queries to the right model
✅ **Price Prediction**: Predicts market prices using trained XGBoost model
✅ **Demand Prediction**: Predicts crop demand using trained XGBoost model
✅ **LLM Integration**: Uses Flan-T5 for general agricultural questions
✅ **Auto-reload**: Development server with auto-reload on code changes
✅ **Interactive Docs**: Swagger UI for testing endpoints
✅ **Error Handling**: Comprehensive error messages and status codes
✅ **CORS Enabled**: Cross-origin requests allowed

## File Structure

```
agri_ai_agent/
├── app_api.py                 # FastAPI application
├── requirements_api.txt       # API dependencies
├── core/
│   ├── agent.py              # AgriAgent with routing
│   ├── llm_engine.py         # LLM (Flan-T5)
│   └── ...
├── ../
│   ├── price_model.py        # Price prediction model
│   └── demand_model.py       # Demand prediction model
```
