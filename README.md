# AutoValue — Used Car Price Prediction System

An end-to-end Machine Learning web application that predicts used car market prices based on 12 key vehicle attributes. Built with **CatBoost Regressor**, **FastAPI**, and **React (Vite + Tailwind CSS)**.

📖 **[Read the Full Academic & Technical Documentation](file:///d:/github/used-car-price-prediction-frontend/PROJECT_DOCUMENTATION.md)**

---

## Highlights & Features

* 🚗 **CatBoost ML Model:** Trained on 15,400+ car entries with **94.4% R² Accuracy** and **₹95,774 MAE**.
* ⚡ **FastAPI Backend:** Provides real-time inference endpoints (`/predict`) and dataset catalog endpoints (`/catalog`).
* 🔍 **Searchable UI:** Interactive combobox allowing users to search and select from 120+ car models.
* ⚡ **Auto-Fill Logic:** Selecting a car automatically auto-fills `brand` and `model` fields.
* 📊 **Price Range Estimation:** Displays estimated value along with a realistic low-to-high market range.

---

## Quick Start

### 1. Backend Server
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend Application
```bash
# In project root
npm run dev
```

Open `http://localhost:5173` in your browser.

