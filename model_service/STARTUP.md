# Model Service Startup Guide

## Starting the Service

Run from the project root:
```bash
npm run model
```

Or directly from the model_service directory:
```bash
cd model_service
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Expected Console Output

When starting, you should see:

1. **Model Loading Messages:**
   ```
   Using device: cpu
   Loading models and scalers...
   Loaded 4 modes: ['Same Day', 'First Class', 'Second Class', 'Standard Class']
   ✓ 3 simulator models loaded.
   ✓ Actor model loaded.
   ```

2. **Server Startup:**
   ```
   INFO:     Started server process [xxxxx]
   INFO:     Waiting for application startup.
   INFO:     Application startup complete.
   INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
   ```

## Verifying the Service

### Health Check
```bash
# PowerShell
Invoke-WebRequest -Uri http://localhost:8000/health

# Should return: {"status":"ready"}
```

### Test Inference
```powershell
$body = @{
    order_city='Mumbai'
    order_country='India'
    customer_city='Delhi'
    customer_country='India'
    sales_per_customer=500
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:8000/infer_live -Method POST -Body $body -ContentType 'application/json'
```

## Common Issues

1. **Port already in use**: Stop any existing process on port 8000
2. **Model files not found**: Ensure model files exist in `models/` directory
3. **Dependencies missing**: Run `pip install -r requirements.txt`

## Troubleshooting

If you see errors:
- Check that all model files exist in `models/` directory
- Verify Python dependencies are installed: `pip install -r requirements.txt`
- Check if port 8000 is available: `netstat -ano | findstr :8000`

