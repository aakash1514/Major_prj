# ML Service

Flask wrapper service for existing trained models (no retraining).

## Install Dependencies

Use Python 3.12: the pinned scikit-learn 1.4.2 has no wheels for Python 3.13+.

```bash
pip install -r requirements.txt
```

`scikit-learn` and `xgboost` are pinned to the versions the models were saved with
(`price_predictor_xgb.pkl` is a scikit-learn RandomForestRegressor despite its name;
`demand_predictor_xgb.pkl` is an XGBRegressor). Loading them with other versions
logs `InconsistentVersionWarning` and is not guaranteed to give the same results.

## Configure Environment

Copy `.env.example` values into your environment before running the app.

Example variable:

- `ML_SERVICE_PORT=5001` (port for `python app.py`)
- `FLASK_ENV=production` (debug mode is enabled only when this is `development`; default is off)

## Start Server

Production (Windows and Linux; this is what the Docker image will use, and the
setting the perf benchmarks used):

```bash
waitress-serve --host=0.0.0.0 --port=5001 --threads=8 app:app
```

`waitress-serve` takes its port from `--port`, not `ML_SERVICE_PORT`.
On Linux, `gunicorn -w 4 -b 0.0.0.0:5001 app:app` also works.

Development (Flask dev server with debugger and reloader):

```bash
FLASK_ENV=development python app.py
```

The service has no CORS headers: only the backend calls it (via `ML_SERVICE_URL`),
so it should not be exposed publicly.

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
