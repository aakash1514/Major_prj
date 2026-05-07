# ML Service

Flask wrapper service for existing trained models (no retraining).

## Install Dependencies

```bash
pip install -r requirements.txt
```

## Configure Environment

Copy `.env.example` values into your environment before running the app.

Example variable:

- `ML_SERVICE_PORT=5001`

## Start Server

```bash
python app.py
```

Default URL: `http://127.0.0.1:5001`

## API Endpoints

### GET /health

Health check endpoint.

Response:

```json
{
  "status": "ok"
}
```

### POST /predict/price

Uses the price model with these 10 feature columns:

1. `State Name`
2. `District Name`
3. `Market Name`
4. `Variety`
5. `Group`
6. `Grade`
7. `Arrivals (Tonnes)`
8. `Month`
9. `Day`
10. `Weekday`

Recommended request payload:

```json
{
  "features": {
    "State Name": 1,
    "District Name": 1,
    "Market Name": 1,
    "Variety": 1,
    "Group": 1,
    "Grade": 1,
    "Arrivals (Tonnes)": 100,
    "Month": 4,
    "Day": 16,
    "Weekday": 2
  }
}
```

### POST /predict/demand

Uses the demand model with `16` numeric input features.

The persisted demand model does not include named feature columns, so send an ordered numeric vector with exactly 16 values.

Recommended request payload:

```json
{
  "features": [
    1, 2, 3, 4,
    5, 6, 7, 8,
    9, 10, 11, 12,
    13, 14, 15, 16
  ]
}
```

## Prediction Response Format

### Price response (`POST /predict/price`)

```json
{
  "prediction": 10953.33,
  "confidence": 0.81,
  "model": "price_predictor_xgb",
  "timestamp": "2026-04-16T17:05:10.859816+00:00",
  "unit": "INR/quintal",
  "price_breakdown": {
    "min_price": 8313.33,
    "max_price": 14020.0,
    "modal_price": 10953.33,
    "unit": "INR/quintal",
    "min_price_per_kg": 83.13,
    "max_price_per_kg": 140.2,
    "modal_price_per_kg": 109.53
  }
}
```

`prediction` uses the modal market price. Unit conversion helper values are included under `price_breakdown`.

### Demand response (`POST /predict/demand`)

```json
{
  "prediction": 28576192.0,
  "confidence": 0.85,
  "model": "demand_predictor_xgb",
  "timestamp": "2026-04-16T17:05:48.209336+00:00"
}
```

## Notes About Input Shapes

- The service accepts object and array inputs.
- For best results, send exact model-shaped inputs:
  - Price: 10 named columns above.
  - Demand: 16 numeric values in fixed order.
- If fewer values are sent, the service currently pads missing values with `0`.
- If extra values are sent, the service truncates to the expected size.
