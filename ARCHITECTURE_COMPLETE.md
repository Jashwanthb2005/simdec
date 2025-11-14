# Sim-to-Dec Logistics Intelligence Platform - Complete Architecture Diagram

This document contains a single comprehensive architecture diagram showing all components, services, data flows, and integrations of the Sim-to-Dec platform.

---

## Complete System Architecture

```mermaid
graph TB
    %% User Layer
    User[👤 User<br/>Browser]
    
    %% Client Layer
    subgraph Client["🖥️ CLIENT LAYER (Port 5173)"]
        direction TB
        React[React 18 + Vite 7]
        Pages[Pages:<br/>Homepage, Dashboard,<br/>Inference, Analytics]
        Components[Components:<br/>Charts, Widgets,<br/>Forms, Layout]
        Context[AuthContext<br/>State Management]
        API_Client[Axios Client<br/>JWT Interceptors]
    end
    
    %% API Gateway Layer
    subgraph Server["⚙️ API GATEWAY LAYER (Port 5000)"]
        direction TB
        Express[Express 5 + Node.js]
        Routes[Routes:<br/>/api/auth<br/>/api/shipments<br/>/api/admin<br/>/api/infer]
        Middleware[Middleware:<br/>JWT Auth<br/>Role Validation<br/>CORS, Helmet]
        Services[Services:<br/>Weather Service<br/>Email Service<br/>Scheduler]
        Models[Models:<br/>User, Shipment<br/>Notification]
    end
    
    %% ML Inference Layer
    subgraph MLService["🤖 ML INFERENCE LAYER (Port 8000)"]
        direction TB
        FastAPI[FastAPI + Uvicorn]
        Inference[Inference Engine<br/>sim_inference.py]
        PyTorch[PyTorch Models:<br/>Ensemble 3x<br/>Actor Policy]
        Features[Feature Engineering:<br/>Distance, Weather,<br/>Fuel, Weight]
    end
    
    %% Data Layer
    subgraph Data["💾 DATA LAYER"]
        direction LR
        MongoDB[(MongoDB<br/>Port 27017<br/>Optional)]
        CSV[CSV Cache<br/>api_cache.csv<br/>Mapbox Routes]
    end
    
    %% External Services
    subgraph External["🌐 EXTERNAL SERVICES"]
        direction TB
        Mapbox[Mapbox API<br/>Geocoding<br/>Directions Matrix]
        Weather[Open-Meteo API<br/>Weather Forecast]
        Fuel[EIA API<br/>Fuel Price Index]
        OSM[OpenStreetMap<br/>Nominatim<br/>Geocoding]
        SMTP[SMTP Server<br/>Email Notifications]
    end
    
    %% User to Client
    User -->|HTTP| Client
    
    %% Client Internal Flow
    React --> Pages
    Pages --> Components
    Components --> Context
    Context --> API_Client
    
    %% Client to Server
    API_Client -->|HTTP/REST<br/>JWT Token| Server
    
    %% Server Internal Flow
    Express --> Routes
    Routes --> Middleware
    Middleware --> Services
    Services --> Models
    
    %% Server to ML Service
    Routes -->|HTTP Proxy<br/>/infer_live| MLService
    
    %% Server to Data
    Models -->|MongoDB Driver| MongoDB
    Services -->|Read/Write| CSV
    
    %% ML Service Internal Flow
    FastAPI --> Inference
    Inference --> PyTorch
    Inference --> Features
    
    %% ML Service to External APIs
    Features -->|API Call| Mapbox
    Features -->|API Call| Weather
    Features -->|API Call| Fuel
    
    %% Server to External APIs
    Services -->|API Call| OSM
    Services -->|API Call| Weather
    Services -->|SMTP| SMTP
    
    %% Data Flow Labels
    Client -.->|1. User Request| Server
    Server -.->|2. Proxy Request| MLService
    MLService -.->|3. Fetch Data| External
    MLService -.->|4. Run Inference| PyTorch
    MLService -.->|5. Return Result| Server
    Server -.->|6. Save to DB| MongoDB
    Server -.->|7. Response| Client
    
    %% Styling
    style User fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    style Client fill:#61dafb,stroke:#20232a,stroke-width:2px
    style Server fill:#68a063,stroke:#2d5016,stroke-width:2px
    style MLService fill:#3776ab,stroke:#1e3a5f,stroke-width:2px
    style Data fill:#47a248,stroke:#2d5016,stroke-width:2px
    style External fill:#ff9800,stroke:#e65100,stroke-width:2px
    style MongoDB fill:#47a248,stroke:#2d5016,stroke-width:3px
    style PyTorch fill:#ee4c2c,stroke:#8b0000,stroke-width:2px
```

---

## Architecture Components Breakdown

### 🖥️ Client Layer (Port 5173)
- **Technology**: React 18, Vite 7, Tailwind CSS
- **Components**: Pages, Charts, Widgets, Forms
- **State Management**: React Context API, localStorage
- **Communication**: Axios with JWT interceptors

### ⚙️ API Gateway Layer (Port 5000)
- **Technology**: Node.js, Express 5
- **Security**: JWT authentication, Role-based access control
- **Features**: Rate limiting, CORS, Helmet security headers
- **Services**: Weather integration, Email notifications, Background jobs

### 🤖 ML Inference Layer (Port 8000)
- **Technology**: Python 3.10+, FastAPI, PyTorch 2.5.0
- **Models**: Ensemble of 3 simulators + Actor policy network
- **Process**: Feature engineering → Normalization → Monte Carlo simulation → Recommendation

### 💾 Data Layer
- **MongoDB**: User data, shipments, notifications, history (optional)
- **CSV Cache**: Mapbox API responses for route caching

### 🌐 External Services
- **Mapbox**: Geocoding and route distance calculations
- **Open-Meteo**: Weather data and forecasts
- **EIA**: Fuel price indices
- **OpenStreetMap**: Geocoding fallback
- **SMTP**: Email delivery

---

## Data Flow Sequence

1. **User Request**: User submits shipment request via React client
2. **Authentication**: Client sends JWT token with API request
3. **Server Processing**: Express validates token and processes request
4. **ML Proxy**: Server forwards inference request to FastAPI service
5. **External Data Fetch**: ML service fetches route, weather, and fuel data
6. **Model Inference**: PyTorch models process features and generate recommendations
7. **Data Persistence**: Server saves shipment with AI recommendation to MongoDB
8. **Response**: Server returns complete data to client
9. **UI Update**: Client displays results in dashboards and charts

---

## Technology Stack Summary

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite 7, Tailwind CSS, Axios, Recharts, Three.js, Mapbox GL |
| **Backend** | Node.js 18+, Express 5, MongoDB 6, JWT, Bcrypt, Helmet, CORS |
| **ML Service** | Python 3.10+, FastAPI, Uvicorn, PyTorch 2.5.0, NumPy, Pandas |
| **External** | Mapbox API, Open-Meteo, EIA API, OpenStreetMap, SMTP |

---

## Port Configuration

- **Client**: `http://localhost:5173`
- **Server**: `http://localhost:5000`
- **ML Service**: `http://localhost:8000`
- **MongoDB**: `mongodb://localhost:27017` (optional)

---

## Security Layers

1. **CORS**: Whitelist allowed origins
2. **Rate Limiting**: 200 requests/minute per IP (production)
3. **Helmet**: Security HTTP headers
4. **JWT**: Token-based authentication (7-day expiry)
5. **Bcrypt**: Password hashing with salt
6. **Role-Based Access**: Operator, Manager, Analyst, Admin roles

---

## Deployment Architecture

- **Client**: Static files (Vite build) → CDN/Static hosting
- **Server**: Node.js runtime → Platform hosting (Render, Heroku, AWS)
- **ML Service**: Python runtime → Platform hosting (Render, Railway, AWS)
- **Database**: MongoDB Atlas (cloud) or self-hosted

---

**Note**: This diagram shows the complete architecture in a single view. All components communicate via HTTP/REST protocols, with the server acting as the API gateway between the client and ML service.

