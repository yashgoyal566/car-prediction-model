"""Train the production prediction model from the cleaned project dataset."""
from pathlib import Path
import json

import pandas as pd
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT_ROOT / "cardekho_dataset.csv"
MODEL_PATH = Path(__file__).resolve().parent / "artifacts" / "car_price_model.cbm"
METADATA_PATH = Path(__file__).resolve().parent / "artifacts" / "model_metadata.json"

FEATURES = [
    "car_name", "brand", "model", "vehicle_age", "km_driven", "seller_type",
    "fuel_type", "transmission_type", "mileage", "engine", "max_power", "seats",
]
CATEGORICAL_FEATURES = ["car_name", "brand", "model", "seller_type", "fuel_type", "transmission_type"]
TARGET = "selling_price"


def main():
    df = pd.read_csv(DATA_PATH)
    missing = set(FEATURES + [TARGET]) - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {sorted(missing)}")

    # Defensive training cleanup: the source CSV has already been cleaned, but this
    # makes retraining safe if a raw export is supplied later.
    df = df.drop(columns=["Unnamed: 0"], errors="ignore")
    df = df.loc[df["seats"].between(1, 9)].copy()
    df[CATEGORICAL_FEATURES] = df[CATEGORICAL_FEATURES].astype(str)

    X, y = df[FEATURES], df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = CatBoostRegressor(
        iterations=400,
        depth=6,
        learning_rate=0.06,
        loss_function="RMSE",
        random_seed=42,
        thread_count=4,
        verbose=False,
    )
    model.fit(X_train, y_train, cat_features=CATEGORICAL_FEATURES)
    predictions = model.predict(X_test)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    model.save_model(MODEL_PATH)
    metrics = {
        "mae": round(float(mean_absolute_error(y_test, predictions)), 2),
        "rmse": round(float(mean_squared_error(y_test, predictions) ** 0.5), 2),
        "r2": round(float(r2_score(y_test, predictions)), 4),
        "training_rows": len(X_train),
        "test_rows": len(X_test),
    }
    METADATA_PATH.write_text(json.dumps({"features": FEATURES, "metrics": metrics}, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
