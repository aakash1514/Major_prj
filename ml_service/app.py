import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Root path: C:/Major_prj
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = PROJECT_ROOT / "ml models" / "models"
PRICE_MODEL_PATH = MODEL_DIR / "price_predictor_xgb.pkl"
DEMAND_MODEL_PATH = MODEL_DIR / "demand_predictor_xgb.pkl"


def load_model(model_path: Path):
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")
    return joblib.load(model_path)


def to_model_input(payload):
    """
    Supported payload shapes:
    1) {"features": [v1, v2, ...]}
    2) {"features": [[...], [...]]}
    3) {"features": {"f1": v1, "f2": v2, ...}}
    4) {"f1": v1, "f2": v2, ...}
    """
    if payload is None:
        raise ValueError("Request JSON body is required")

    features = payload.get("features", payload)

    if isinstance(features, dict):
        return pd.DataFrame([features])

    if isinstance(features, list):
        if len(features) == 0:
            raise ValueError("'features' must not be empty")

        if isinstance(features[0], dict):
            return pd.DataFrame(features)

        if isinstance(features[0], (list, tuple)):
            return np.array(features)

        return np.array([features])

    raise ValueError("Invalid input format. Provide 'features' as list or object")


def align_features_for_model(model, raw_input):
    """
    Align input to the expected shape of persisted models.
    - If model exposes feature_names_in_, use those names and fill missing with 0.
    - Otherwise, coerce to numeric matrix and pad/truncate to n_features_in_.
    """
    n_features = getattr(model, "n_features_in_", None)
    feature_names = getattr(model, "feature_names_in_", None)

    if isinstance(raw_input, pd.DataFrame):
        if feature_names is not None:
            aligned = pd.DataFrame(columns=feature_names)
            for name in feature_names:
                aligned[name] = raw_input[name] if name in raw_input.columns else 0
            return aligned

        arr = raw_input.to_numpy(dtype=float, copy=True)
    else:
        arr = np.array(raw_input, dtype=float)

    if arr.ndim == 1:
        arr = arr.reshape(1, -1)

    if n_features is None:
        return arr

    current = arr.shape[1]
    if current == n_features:
        return arr
    if current < n_features:
        pad = np.zeros((arr.shape[0], n_features - current), dtype=float)
        return np.concatenate([arr, pad], axis=1)

    return arr[:, :n_features]


def estimate_confidence(model, model_input):
    """
    Returns a best-effort confidence in [0, 1].
    Regression models often do not expose confidence; this function falls back safely.
    """
    try:
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(model_input)
            if isinstance(proba, np.ndarray) and proba.ndim == 2 and proba.shape[0] > 0:
                return float(np.clip(np.max(proba[0]), 0.0, 1.0))

        if hasattr(model, "estimators_"):
            member_predictions = []
            for estimator in model.estimators_:
                pred = estimator.predict(model_input)
                member_predictions.append(float(np.ravel(pred)[0]))

            if member_predictions:
                std = float(np.std(member_predictions))
                confidence = 1.0 / (1.0 + std)
                return float(np.clip(confidence, 0.0, 1.0))
    except Exception:
        pass

    return 0.85


def run_prediction(model_path: Path, payload):
    model = load_model(model_path)
    raw_input = to_model_input(payload)
    model_input = align_features_for_model(model, raw_input)

    prediction = model.predict(model_input)
    prediction_value = float(np.ravel(prediction)[0])
    confidence_value = estimate_confidence(model, model_input)

    return {
        "prediction": prediction_value,
        "confidence": confidence_value,
        "model": model_path.stem,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def run_price_prediction(payload):
    model = load_model(PRICE_MODEL_PATH)
    raw_input = to_model_input(payload)
    model_input = align_features_for_model(model, raw_input)

    prediction = model.predict(model_input)
    confidence_value = estimate_confidence(model, model_input)
    prediction_array = np.asarray(prediction)

    # Price model appears to be multi-output with three values for one row.
    if prediction_array.ndim == 2 and prediction_array.shape[1] >= 3:
        min_price_qtl, max_price_qtl, modal_price_qtl = [
            float(prediction_array[0][0]),
            float(prediction_array[0][1]),
            float(prediction_array[0][2]),
        ]
    elif prediction_array.ndim == 1 and prediction_array.size >= 3:
        min_price_qtl, max_price_qtl, modal_price_qtl = [
            float(prediction_array[0]),
            float(prediction_array[1]),
            float(prediction_array[2]),
        ]
    else:
        scalar_prediction = float(np.ravel(prediction_array)[0])
        min_price_qtl = scalar_prediction
        max_price_qtl = scalar_prediction
        modal_price_qtl = scalar_prediction

    return {
        # Keep backward-compatible key; value is modal market price.
        "prediction": modal_price_qtl,
        "confidence": confidence_value,
        "model": PRICE_MODEL_PATH.stem,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "unit": "INR/quintal",
        "price_breakdown": {
            "min_price": min_price_qtl,
            "max_price": max_price_qtl,
            "modal_price": modal_price_qtl,
            "unit": "INR/quintal",
            "min_price_per_kg": min_price_qtl / 100.0,
            "max_price_per_kg": max_price_qtl / 100.0,
            "modal_price_per_kg": modal_price_qtl / 100.0,
        },
    }


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/predict/price")
def predict_price():
    try:
        payload = request.get_json(silent=True)
        result = run_price_prediction(payload)
        return jsonify(result)
    except (ValueError, FileNotFoundError) as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Prediction failed: {str(exc)}"}), 500


@app.post("/predict/demand")
def predict_demand():
    try:
        payload = request.get_json(silent=True)
        result = run_prediction(DEMAND_MODEL_PATH, payload)
        return jsonify(result)
    except (ValueError, FileNotFoundError) as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Prediction failed: {str(exc)}"}), 500


if __name__ == "__main__":
    port = int(os.getenv("ML_SERVICE_PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=True)
