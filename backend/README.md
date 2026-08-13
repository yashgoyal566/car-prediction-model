# AutoValue backend

Train the model from the cleaned dataset:

```powershell
cd backend
python -m pip install -r requirements.txt
python train_model.py
```

Start the prediction API:

```powershell
uvicorn main:app --reload --port 8000
```

The frontend sends its feature values to `POST http://localhost:8000/predict`.
