# Sim-to-Dec Inference System

A full-stack application for logistics inference using machine learning models.

## Architecture

- **Client** (React + Vite): Frontend on port 5173
- **Server** (Node.js + Express): Backend API on port 5000
- **Model Service** (Python + FastAPI): ML inference service on port 8000

## Setup

### 1. Install Dependencies

```bash
# Install client and server dependencies
npm run install:all

# Install Python dependencies for model service
cd model_service
pip install -r requirements.txt
```

### 2. Configure Environment Variables (Optional)

**MongoDB is optional!** The server works perfectly without it.

**If you want to use MongoDB:**
1. Start MongoDB service: `net start MongoDB` (Windows, requires admin)
2. Create a `.env` file in the `server` directory:

```env
MONGO_URI=mongodb://localhost:27017
PORT=5000
```

**If MongoDB fails to connect:**
- The server will continue to work without it
- History won't be saved, but all API endpoints work normally
- See `server/MONGODB_FIX.md` for troubleshooting

### 3. Run Services

You need to run all three services:

**Terminal 1 - Model Service (Python):**
```bash
npm run model
# Or: cd model_service; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Note**: On Windows PowerShell, use `;` instead of `&&` in scripts.

**Terminal 2 - Server (Node.js):**
```bash
npm run server
# Or: cd server && npm start
```

**Terminal 3 - Client (React):**
```bash
npm run client
# Or: cd client && npm run dev
```

## Service Endpoints

- **Client**: http://localhost:5173
- **Server API**: http://localhost:5000
- **Model Service API**: http://localhost:8000
  - Health check: http://localhost:8000/health
  - Inference: http://localhost:8000/infer_live

## Data Flow

1. Client sends request to `http://localhost:5000/api/infer`
2. Server proxies to `http://127.0.0.1:8000/infer_live`
3. Model service processes the request and returns results
4. Server saves to MongoDB (if configured) and returns to client

## Troubleshooting

- **CORS errors**: Make sure all services are running and CORS is configured
- **Connection refused**: Verify all services are running on correct ports
- **MongoDB errors**: Server will continue without MongoDB, but history won't be saved

