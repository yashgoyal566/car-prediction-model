# Used Car Price Prediction System
## Academic & Technical Documentation

---

### Executive Summary

**AutoValue** is a full-stack Machine Learning application designed to accurately estimate market prices of used automobiles based on historical sales data. The system combines a **CatBoost Gradient Boosting Regression Model** on the backend with a modern **FastAPI REST API** and a responsive **React (Vite + Tailwind CSS)** user interface.

---

### 1. Problem Statement & Objectives

#### 1.1 Problem Statement
Determining a fair market price for a used car is challenging due to complex, non-linear relationships between vehicle attributes (e.g., brand reputation, engine capacity, kilometers driven, vehicle age, and transmission type). Asymmetric information between buyers and sellers often leads to sub-optimal pricing.

#### 1.2 Project Objectives
* **Data-Driven Valuation:** Train a supervised regression model capable of capturing complex interactions among 12 vehicle attributes.
* **Real-Time REST API:** Expose the model through a high-performance FastAPI backend with strict schema validation.
* **Dataset-Grounded Frontend:** Build a user interface that dynamically syncs with dataset categories to eliminate invalid input errors.
* **Explainable Price Range:** Provide users with an estimated valuation along with an error-bounded price range (Low–High) based on Mean Absolute Error (MAE).

---

### 2. System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client ["Frontend (React + Vite + Tailwind CSS)"]
        UI["User Interface"]
        SearchSelect["Searchable Car Name Dropdown"]
        AutoFill["Auto-fill Engine (Brand & Model)"]
        FetchAPI["HTTP Client (Fetch API)"]
    end

    subgraph Server ["Backend (FastAPI Engine)"]
        FastAPI["FastAPI REST Application"]
        CatalogEndpoint["/catalog Endpoint"]
        PredictEndpoint["/predict Endpoint"]
        Validation["Pydantic Data Validation & Canonical Matching"]
    end

    subgraph ML ["Machine Learning Pipeline"]
        Model["CatBoostRegressor Model (.cbm)"]
        Metadata["Model Metadata & Metrics (.json)"]
        Dataset["Cardekho Cleaned Dataset (.csv)"]
    end

    UI --> SearchSelect
    SearchSelect --> AutoFill
    FetchAPI -->|GET /catalog| CatalogEndpoint
    CatalogEndpoint -->|Valid dropdown options & mapping| FetchAPI
    FetchAPI -->|POST /predict| PredictEndpoint
    PredictEndpoint --> Validation
    Validation --> Model
    Metadata --> PredictEndpoint
    Dataset -->|Training Data| Model
    PredictEndpoint -->|JSON Response (Predicted Price & Range)| UI
```

---

### 3. Machine Learning Model & Dataset

#### 3.1 Dataset Attributes
The model is trained on the **CarDekho Used Car Dataset** containing **15,409 vehicle entries**.

| Attribute | Type | Description | Range / Values |
| :--- | :--- | :--- | :--- |
| `car_name` | Categorical | Full name of the vehicle | 121 unique names (e.g., Maruti Swift, BMW X5) |
| `brand` | Categorical | Vehicle Manufacturer | 32 brands (Maruti, Hyundai, Audi, etc.) |
| `model` | Categorical | Specific trim/series | 120 unique models |
| `vehicle_age` | Numerical | Age of car in years | 0 – 40 years |
| `km_driven` | Numerical | Total kilometers driven | 1 – 5,000,000 km |
| `seller_type` | Categorical | Type of seller | Individual, Dealer, Trustmark Dealer |
| `fuel_type` | Categorical | Engine fuel type | Petrol, Diesel, CNG, Electric, LPG |
| `transmission_type` | Categorical | Gearbox type | Manual, Automatic |
| `mileage` | Numerical | Fuel efficiency | km/l or km/kg |
| `engine` | Numerical | Displacement capacity | Engine size in cc (e.g., 1197 cc) |
| `max_power` | Numerical | Engine output power | Output power in bhp (e.g., 85 bhp) |
| `seats` | Numerical | Seating capacity | 2, 4, 5, 6, 7, 8, 9 seats |
| **`selling_price`** | **Target** | **Actual sales price (INR)** | **Dependent Variable (Supervised Target)** |

#### 3.2 Target Variable Clarification
* **`selling_price`** is present in the training CSV (`cardekho_dataset.csv`) as the ground-truth label for supervised learning.
* At inference time (when user uses the app), `selling_price` is **predicted by the CatBoost model**.

#### 3.3 Model Selection & Training Logic
* **Algorithm:** **CatBoostRegressor** (Category Boosting Algorithm)
* **Why CatBoost?** CatBoost handles high-cardinality categorical features natively without requiring manual One-Hot Encoding or target encoding, avoiding data leakage.
* **Hyperparameters:**
  * Iterations: `400`
  * Depth: `6`
  * Learning Rate: `0.06`
  * Loss Function: `RMSE` (Root Mean Squared Error)
  * Random Seed: `42`
* **Train/Test Split:** 80% Training (12,327 rows) / 20% Holdout Testing (3,082 rows)

#### 3.4 Model Evaluation Metrics
* **R² Score:** `0.9440` (The model explains **94.4% of the variance** in car prices)
* **Mean Absolute Error (MAE):** `₹95,774.20`
* **Root Mean Squared Error (RMSE):** `₹185,397.88`

---

### 4. Backend Architecture (FastAPI & Python)

#### 4.1 Key Endpoints
1. `GET /catalog`
   * Dynamically inspects the dataset and returns valid categories for all dropdowns (`brands`, `car_names`, `models`, `fuel_types`, `transmission_types`, `seller_types`, `seats`).
   * Provides a lookup map (`car_name_map`) mapping each vehicle name to its exact `brand` and `model`.
2. `POST /predict`
   * Validates incoming vehicle payload using Pydantic `CarFeatures`.
   * Applies `canonical_value` normalization to ensure input strings match dataset categories regardless of case/whitespace.
   * Runs model inference and calculates expected price bounds: `[price - MAE, price + MAE]`.
3. `GET /health` & `GET /model-info`
   * Health checks and runtime metadata reporting.

---

### 5. Frontend Architecture (React & Tailwind CSS)

#### 5.1 Key Features
* **Searchable Combobox for `car_name`:** Live filtering input allowing users to search and select from 121 vehicle names.
* **Automatic Auto-Fill:** Selecting a `car_name` instantly auto-fills and locks the corresponding `brand` and `model` fields, preventing user input mismatches.
* **Dynamic Options:** Dropdowns (`fuel_type`, `transmission_type`, `seller_type`, `seats`) are populated dynamically from `/catalog`, eliminating hardcoded values.
* **Graceful Degradation:** Displays a user-friendly error banner if the backend API is offline.
* **Responsive & Accessible Design:** Built with Tailwind CSS, custom card shadows, SVG icons, and standard HTML5 form controls.

---

### 6. Step-by-Step Execution Guide

#### Prerequisites
* Python 3.10+
* Node.js 18+

#### Step 1: Start Backend API
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
Backend will run at: `http://127.0.0.1:8000` (API Docs at `http://127.0.0.1:8000/docs`).

#### Step 2: Start Frontend Web App
```bash
# In project root
npm run dev
```
Frontend will run at: `http://127.0.0.1:5173` (or `5174`).

---

### 7. Key Presentation Points for the Professor

1. **End-to-End Integration:** The system connects raw data cleaning, machine learning training, API serving, and dynamic frontend interaction without hardcoded options.
2. **Categorical Handling:** CatBoost was specifically chosen over standard Random Forest or linear regression to handle 120+ categorical vehicle names natively without sparse matrix overhead.
3. **Data Integrity:** Backend validation prevents out-of-distribution inputs (e.g., an illegal brand-model pairing) before passing data to the model.
4. **User Experience:** Autocomplete search and auto-fill minimize user friction and guarantee valid payload creation.

---

### 8. Project Structure

```
used-car-price-prediction-frontend/
├── backend/
│   ├── artifacts/
│   │   ├── car_price_model.cbm       # Trained CatBoost model weights
│   │   └── model_metadata.json       # Metrics & feature list
│   ├── main.py                       # FastAPI application & catalog logic
│   ├── train_model.py                # Model training script
│   └── requirements.txt              # Python backend dependencies
├── src/
│   ├── App.jsx                       # Main React component
│   ├── index.css                     # Global styles & Tailwind layers
│   └── main.jsx                      # React entrypoint
├── cardekho_dataset.csv              # Source cleaned dataset
├── index.html                        # Main HTML document
├── package.json                      # Frontend dependencies
├── tailwind.config.js                # Custom Tailwind configuration
└── PROJECT_DOCUMENTATION.md          # Academic project documentation
```
