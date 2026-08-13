from pathlib import Path
import json

import pandas as pd
from catboost import CatBoostRegressor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "artifacts" / "car_price_model.cbm"
METADATA_PATH = ROOT / "artifacts" / "model_metadata.json"
DATA_PATH = ROOT.parent / "cardekho_dataset.csv"

app = FastAPI(title="AutoValue Prediction API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_catalog():
    """Load the valid vehicle combinations from the same cleaned training dataset."""
    if not DATA_PATH.exists():
        raise RuntimeError(f"Dataset not found: {DATA_PATH}")
    data = pd.read_csv(DATA_PATH)
    return {
        "brands": set(data["brand"].astype(str)),
        "car_names": set(data["car_name"].astype(str)),
        "models": set(data["model"].astype(str)),
        "car_to_brand": data.groupby("car_name")["brand"].first().astype(str).to_dict(),
        "car_to_model": data.groupby("car_name")["model"].first().astype(str).to_dict(),
        "seller_types": set(data["seller_type"].astype(str)),
        "fuel_types": set(data["fuel_type"].astype(str)),
        "transmission_types": set(data["transmission_type"].astype(str)),
        "seats": set(data["seats"].astype(str)),
    }


CATALOG = load_catalog()


def canonical_value(value: str, options: set[str], field_name: str) -> str:
    """Accept harmless case/spacing differences but reject unknown/misspelled values."""
    normalized = " ".join(value.split()).casefold()
    match = next((option for option in options if option.casefold() == normalized), None)
    if match is None:
        raise ValueError(f"Invalid {field_name}. Please choose a value available in the training data.")
    return match


class CarFeatures(BaseModel):
    car_name: str = Field(min_length=1)
    brand: str = Field(min_length=1)
    model: str = Field(min_length=1)
    vehicle_age: int = Field(ge=0, le=40)
    km_driven: int = Field(ge=1, le=5_000_000)
    seller_type: str = Field(min_length=1)
    fuel_type: str = Field(min_length=1)
    transmission_type: str = Field(min_length=1)
    mileage: float = Field(gt=0, le=100)
    engine: int = Field(gt=0, le=10_000)
    max_power: float = Field(gt=0, le=2_000)
    seats: int = Field(ge=1, le=9)

    @model_validator(mode="after")
    def validate_catalog_values(self):
        self.car_name = canonical_value(self.car_name, CATALOG["car_names"], "car name")
        self.brand = canonical_value(self.brand, CATALOG["brands"], "brand")
        self.model = canonical_value(self.model, CATALOG["models"], "car model")
        self.seller_type = canonical_value(self.seller_type, CATALOG["seller_types"], "seller type")
        self.fuel_type = canonical_value(self.fuel_type, CATALOG["fuel_types"], "fuel type")
        self.transmission_type = canonical_value(self.transmission_type, CATALOG["transmission_types"], "transmission type")

        expected_brand = CATALOG["car_to_brand"][self.car_name]
        expected_model = CATALOG["car_to_model"][self.car_name]
        if self.brand != expected_brand:
            raise ValueError(f"Brand must be '{expected_brand}' for {self.car_name}.")
        if self.model != expected_model:
            raise ValueError(f"Car model must be '{expected_model}' for {self.car_name}.")
        return self


def load_model():
    if not MODEL_PATH.exists():
        return None
    trained = CatBoostRegressor()
    trained.load_model(MODEL_PATH)
    return trained


model = load_model()


# ─── API Routes (must be registered BEFORE the catch-all) ───

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.get("/catalog")
def catalog():
    """Return every valid dropdown value so the frontend stays in sync with the training data."""
    car_name_map = {}
    for car_name in sorted(CATALOG["car_names"]):
        car_name_map[car_name] = {
            "brand": CATALOG["car_to_brand"][car_name],
            "model": CATALOG["car_to_model"][car_name],
        }
    return {
        "brands": sorted(CATALOG["brands"]),
        "car_names": sorted(CATALOG["car_names"]),
        "models": sorted(CATALOG["models"]),
        "fuel_types": sorted(CATALOG["fuel_types"]),
        "transmission_types": sorted(CATALOG["transmission_types"]),
        "seller_types": sorted(CATALOG["seller_types"]),
        "seats": sorted({int(s) for s in CATALOG.get("seats", set())} or [2, 4, 5, 6, 7, 8, 9]),
        "car_name_map": car_name_map,
    }


@app.get("/model-info")
def model_info():
    if not METADATA_PATH.exists():
        raise HTTPException(status_code=503, detail="Model has not been trained. Run train_model.py first.")
    return json.loads(METADATA_PATH.read_text(encoding="utf-8"))


@app.post("/predict")
def predict(features: CarFeatures):
    if model is None:
        raise HTTPException(status_code=503, detail="Model has not been trained. Run train_model.py first.")
    row = pd.DataFrame([features.model_dump()])
    price = max(0, round(float(model.predict(row)[0])))
    # A preliminary range uses the measured holdout MAE, not invented ML logic.
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    margin = round(metadata["metrics"]["mae"])
    return {
        "predicted_price": price,
        "price_range": {"low": max(0, price - margin), "high": price + margin},
        "model_metrics": metadata["metrics"],
    }


# ─── Static file serving (catch-all MUST be last) ───

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

DIST_DIR = ROOT.parent / "dist"
if DIST_DIR.exists() and (DIST_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/", response_class=FileResponse)
    def root():
        return FileResponse(DIST_DIR / "index.html")

    @app.get("/{path:path}")
    def serve_static(path: str):
        file_path = DIST_DIR / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "service": "AutoValue Prediction API",
            "status": "running",
            "model_loaded": model is not None,
            "health": "/health",
            "documentation": "/docs",
            "prediction_endpoint": "/predict",
        }


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
