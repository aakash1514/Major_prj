"""Time-based holdout evaluation of the demand model (ml models/final.csv).

Train on Year <= 2020, test on 2021-2023 (36 of 168 rows, ~21%).
  * retrained: XGBRegressor with the exact hyper-parameters from ml models/demand.ipynb
  * shipped:   ml models/models/demand_predictor_xgb.pkl. Its 16-column input order is undocumented (the notebook
               cell that built df_encoded is missing), so we search plausible encodings and only score it on the
               holdout if exactly one encoding clearly reproduces its training fit. Even then the score is LEAKY:
               the notebook trained it with a random 80/20 split over all years.
  * baselines: last known value (each item's 2020 demand), 3-year moving average (2018-2020 mean),
               plus one-step-ahead variants that use the actual previous year (same information level
               as the model, which receives the true test-year exogenous features).
The price model is not evaluated: its training data is not in the repo.

Usage: python -I perf/ml_eval.py
"""
import io
import itertools
import json
import sys
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "ml models" / "final.csv"
SHIPPED = ROOT / "ml models" / "models" / "demand_predictor_xgb.pkl"
OUT = ROOT / "perf" / "results" / "raw" / "ml-eval.json"
TARGET = "Demand Value (t)"
SPLIT_YEAR = 2020


def metrics(y, p):
    y, p = np.asarray(y, float), np.asarray(p, float)
    return {
        "MAE_t": float(mean_absolute_error(y, p)),
        "RMSE_t": float(np.sqrt(mean_squared_error(y, p))),
        "MAPE_pct": float(np.mean(np.abs((y - p) / y)) * 100),
        "R2": float(r2_score(y, p)),
    }


def load_csv(path):
    # Each line of final.csv is wrapped in one pair of double quotes ("Item,Year,...").
    # Strip them so pandas sees the real columns.
    lines = [ln.strip() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    lines = [ln[1:-1] if ln.startswith('"') and ln.endswith('"') else ln for ln in lines]
    return pd.read_csv(io.StringIO("\n".join(lines)))


NUMERIC = ["Year", "Food supply quantity (kg/capita/yr)", "Import quantity (t)", "Export quantity (t)",
           "GDP(value/cappita)", "Population", "Gov(expenditure)"]


def build_features(df):
    # Notebook path for the retrained model: drop Gov/Import/Export, one-hot Item (12 items, no drop_first)
    # -> Year, food supply, GDP, population + 12 dummies = 16 columns.
    d = df.drop(columns=["Gov(expenditure)", "Import quantity (t)", "Export quantity (t)"])
    d = pd.get_dummies(d, columns=["Item"])
    return d.drop(columns=[TARGET]).astype(float), d[TARGET].astype(float)


def search_shipped_encoding(df, model):
    """Try every subset of numeric columns x {drop_first} x {StandardScaler} that yields 16 columns and
    report how well the shipped model fits ALL rows (it was trained on ~80% of them)."""
    y = df[TARGET].values
    found = []
    for k in range(1, len(NUMERIC) + 1):
        for cols in itertools.combinations(NUMERIC, k):
            for drop_first in (False, True):
                d = pd.get_dummies(df[list(cols) + ["Item"]], columns=["Item"], drop_first=drop_first).astype(float)
                if d.shape[1] != model.n_features_in_:
                    continue
                for scaled in (False, True):
                    X = StandardScaler().fit_transform(d.values) if scaled else d.values
                    found.append({"numeric_cols": list(cols), "drop_first": drop_first, "standard_scaled": scaled,
                                  "r2_all_rows": float(r2_score(y, model.predict(X)))})
    found.sort(key=lambda r: -r["r2_all_rows"])
    return found


def main():
    df = load_csv(DATA).sort_values(["Item", "Year"]).reset_index(drop=True)
    X, y = build_features(df)
    train = df["Year"] <= SPLIT_YEAR
    test = ~train

    shipped = joblib.load(SHIPPED)
    candidates = search_shipped_encoding(df, shipped)
    top = candidates[:5]
    # Identifiable only if the best candidate fits near-perfectly and clearly beats the runner-up.
    identifiable = len(candidates) > 1 and top[0]["r2_all_rows"] >= 0.99 and top[0]["r2_all_rows"] - top[1]["r2_all_rows"] >= 0.01

    model = XGBRegressor(n_estimators=100, learning_rate=0.3, max_depth=3, subsample=0.8,
                         colsample_bytree=0.7, random_state=42)
    model.fit(X[train].values, y[train].values)
    pred_retrained = model.predict(X[test].values)

    # Baselines computed only from <= 2020 history (true multi-step forecast).
    hist = df[train]
    last_val = hist[hist["Year"] == SPLIT_YEAR].set_index("Item")[TARGET]
    ma3 = hist[hist["Year"] > SPLIT_YEAR - 3].groupby("Item")[TARGET].mean()
    t = df[test]
    pred_last = t["Item"].map(last_val).values
    pred_ma3 = t["Item"].map(ma3).values

    # One-step-ahead baselines (use the actual previous year(s), like the model uses actual exogenous inputs).
    df["prev1"] = df.groupby("Item")[TARGET].shift(1)
    df["ma3_prev"] = df.groupby("Item")[TARGET].transform(lambda s: s.shift(1).rolling(3).mean())
    pred_last_1step = df.loc[test, "prev1"].values
    pred_ma3_1step = df.loc[test, "ma3_prev"].values

    y_test = y[test].values
    if identifiable:
        Xs_df = pd.get_dummies(df[top[0]["numeric_cols"] + ["Item"]], columns=["Item"], drop_first=top[0]["drop_first"]).astype(float)
        Xs = StandardScaler().fit_transform(Xs_df.values) if top[0]["standard_scaled"] else Xs_df.values
        shipped_metrics = {"xgb_shipped_LEAKY": metrics(y_test, shipped.predict(Xs[test.values]))}
    else:
        shipped_metrics = {}

    result = {
        "dataset": str(DATA.relative_to(ROOT)),
        "rows_total": int(len(df)), "rows_train": int(train.sum()), "rows_test": int(test.sum()),
        "test_fraction": float(test.mean()),
        "items": int(df["Item"].nunique()),
        "train_years": [int(df.loc[train, "Year"].min()), int(df.loc[train, "Year"].max())],
        "test_years": [int(df.loc[test, "Year"].min()), int(df.loc[test, "Year"].max())],
        "features": list(X.columns),
        "shipped_model": {
            "identifiable": identifiable,
            "encodings_tried": len(candidates),
            "top_candidates": top,
            "conclusion": ("Encoding identified; holdout score below is LEAKY." if identifiable else
                           "Input encoding NOT identifiable: several encodings fit about equally well and none reproduces a "
                           "near-perfect training fit, so no holdout score is reported for the shipped model. "
                           "The /predict/demand feature order is undocumented (README example is 1..16)."),
        },
        "models": {
            "xgb_retrained_time_split": metrics(y_test, pred_retrained),
            "baseline_last_known_2020": metrics(y_test, pred_last),
            "baseline_3yr_ma_2018_2020": metrics(y_test, pred_ma3),
            "baseline_last_value_one_step": metrics(y_test, pred_last_1step),
            "baseline_3yr_ma_one_step": metrics(y_test, pred_ma3_1step),
            **shipped_metrics,
        },
        "caveats": [
            "Holdout is only 36 rows (12 items x 3 years); metrics are indicative, not statistically robust.",
            "Test-year features (GDP, population, food supply) are actual observed values, so this measures fit "
            "given the true exogenous inputs, not a true forecast.",
            "Shipped model was trained with a random 80/20 split over all years, so its holdout score is leaky.",
            "The shipped model's input encoding could not be uniquely reconstructed; see shipped_model.",
        ],
        "versions": {"python": sys.version.split()[0], "pandas": pd.__version__, "numpy": np.__version__,
                     "xgboost": __import__("xgboost").__version__, "sklearn": __import__("sklearn").__version__},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2))
    print(f"Shipped model: {len(candidates)} encodings tried, identifiable={identifiable}")
    for c in top:
        print(f"   R2(all rows)={c['r2_all_rows']:.4f}  cols={c['numeric_cols']} drop_first={c['drop_first']} scaled={c['standard_scaled']}")
    print(f"Train {result['train_years']} ({result['rows_train']} rows) | Test {result['test_years']} ({result['rows_test']} rows)")
    print(f"{'model':34} {'MAE (t)':>14} {'RMSE (t)':>14} {'MAPE %':>8} {'R2':>7}")
    for k, m in result["models"].items():
        print(f"{k:34} {m['MAE_t']:14,.0f} {m['RMSE_t']:14,.0f} {m['MAPE_pct']:8.2f} {m['R2']:7.3f}")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
