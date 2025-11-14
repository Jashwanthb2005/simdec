# Sim-to-Dec Logistics Intelligence Platform – Deep Dive

This document captures a full-system narrative of the project: architecture, implementation specifics, service responsibilities, data contracts, operational workflows, and integration points. It is intended as the authoritative reference for new contributors and reviewers.

---

## 1. High-Level Concept
- **Goal:** Deliver AI-assisted shipment planning for logistics teams. Users submit origin/destination metadata; the platform enriches the request with live geospatial, weather, and fuel data, runs a reinforcement-learning (RL) simulator ensemble, and returns transport recommendations alongside operational dashboards.
- **Services:** React/Vite client (`client/`), Node/Express API (`server/`), and FastAPI inference service (`model_service/`). Each runs independently and communicates over HTTP.
- **Data Stores:** MongoDB (optional but recommended) for auth, shipments, notifications, and inference history. Model service persists Mapbox responses to `models/api_cache.csv` as a lightweight CSV cache.

---

## 2. Repository Structure
```
├── client/                 # React SPA
├── server/                 # Express REST API
├── model_service/          # FastAPI + PyTorch inference microservice
├── models/                 # Serialized RL checkpoints (loaded by model_service)
├── *.md                    # Onboarding & feature documentation
└── package.json            # Root NPM scripts orchestrating multi-service tasks
```

Key docs for onboarding:
- `README.md` – quick start for running the tri-service stack.
- `QUICK_START_GUIDE.md`, `STARTUP.md` – environment setup recipes.
- `IMPLEMENTATION_*` and `GLOBE_VISUALIZATION.md` – deep dives into specific features (Mapbox, 3D globe, etc.).

---

## 3. Core Tech Stack
### Client
- React 18 + Vite build tool; React Router for routing; Tailwind CSS/PostCSS for styling.
- State via React Context (`AuthContext.jsx`) and localStorage.
- Visualization libraries (charts, globe, stream graphs) encapsulated under `components/Charts/` & `components/Widgets/`.

### Server
- Node.js 18+, Express 4.
- MongoDB driver (`mongodb`) for persistence (no ODM layer).
- Security middleware: `helmet`, graded `cors`, optional `express-rate-limit`.
- JWT auth (`jsonwebtoken`), password hashing (`bcryptjs`).
- Background cron-like scheduler (custom logic in `services/scheduler.js`).

### Model Service
- Python 3.10+, FastAPI + Uvicorn for serving.
- PyTorch for simulator ensemble (`sim_v40_seed*.pth`) and actor policy (`actor_best_v40.pth`).
- External data via `requests`, `pandas`, `numpy`.
- Live API augmentations: Mapbox Directions Matrix, Open-Meteo, EIA fuel price.

#### Library Inventory (By Service)
- **Client runtime libraries**
  - `react@18`, `react-dom@18` – component/runtime core.
  - `react-router-dom@6` – routing.
  - `axios@1.6` – HTTP client abstraction.
  - `react-hook-form@7` – form state management.
  - `recharts@3`, `d3-hierarchy@3`, `d3-shape@3` – charting and hierarchical visualizations.
  - `framer-motion@11` – declarative animation layer.
  - `mapbox-gl@3`, `react-map-gl@7`, `@react-google-maps/api@2` – interactive mapping (Mapbox + Google Maps).
  - `three@0.158`, `@react-three/fiber@8`, `@react-three/drei@9` – 3D globe/weather widget stack.
  - `serve@14` – static asset hosting for production preview builds.
- **Client build & lint tooling**
  - `vite@7`, `@vitejs/plugin-react@5` – dev server and build pipeline.
  - `tailwindcss@3`, `postcss@8`, `autoprefixer@10` – utility-first CSS workflow.
  - `eslint@9`, `@eslint/js@9`, `eslint-plugin-react-hooks@5` – linting.
  - `@types/react@18`, `@types/react-dom@18` – type declarations for editor tooling.
- **Server dependencies**
  - `express@5` – HTTP framework.
  - `cors@2.8` – CORS control.
  - `helmet@7` – security headers.
  - `express-rate-limit@7` – rate limiting (prod environments).
  - `dotenv@17` – environment configuration loader.
  - `mongodb@6` – native MongoDB driver.
  - `bcryptjs@2` – password hashing.
  - `jsonwebtoken@9` – JWT issuance/verification.
  - `node-fetch@3` – server-side fetch for inference/weather calls.
  - `nodemailer@6` – SMTP email notifications.
- **Model service dependencies**
  - `fastapi==0.115`, `uvicorn[standard]==0.32` – ASGI app/server.
  - `torch==2.5.0` – PyTorch inference runtime.
  - `numpy==1.26`, `pandas==2.2` – data manipulation.
  - `requests==2.32` – external API integrations.
- **Cross-cutting / scripts**
  - Root NPM scripts in `package.json` orchestrate concurrent service startup.
  - `python` standard library modules (`os`, `math`, `random`, `warnings`, `collections`, etc.) support the inference pipeline.
  - External APIs: Mapbox Directions/Geocoding, Open-Meteo, EIA.gov, OpenStreetMap Nominatim.

---

## 4. Development Workflow
1. **Install dependencies:** `npm run install:all` (installs client + server). Python deps: `pip install -r model_service/requirements.txt`.
2. **Environment variables:**
   - `server/.env`: `PORT`, optional `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, email credentials.
   - `model_service`: `EIA_API_KEY` (optional, otherwise fallback), `MAPBOX_API_KEY` embedded in script (should be overridden).
   - Client reads API base URLs from `client/src/api/backendAPI.js`.
3. **Run services (parallel terminals):**
   - `npm run model` → FastAPI on `:8000`.
   - `npm run server` → Express on `:5000`.
   - `npm run client` → Vite dev server on `:5173`.
4. **Testing:** No automated suite provided; manual smoke test via client inference workflow.

---

## 5. Service Implementations

### 5.1 Client (`client/`)
- **Routing:** Public pages (`Homepage`, `Landing`, `Inference/Results`) vs role-protected routes guarded by `ProtectedRoute`. Admin/Manager dashboards require JWT + role verified by backend.
- **Auth flow:** `AuthContext` bootstrap reads `token` + `user` from `localStorage`, validates via `/api/auth/me`. `login`/`register` wrap Axios requests and persist tokens.
- **Inference UX:** `pages/Inference.jsx` captures shipment form → `AppContent.runInference` POSTs to `/api/infer`. Results stored in context/localStorage for retrieval on `Results` page.
- **Dashboards:** Role-tailored pages under `components/Dashboard/` aggregate charts (delay stats, profit trends) and widgets (weather, fuel pricing). Many components expect server APIs like `/api/shipments/stats/overview`.
- **Chatbot & Notifications:** `components/Chatbot/AIChatbot.jsx` provides persistent assistant UI. Notification bell/panel consume `/api/notifications` when available (requires Mongo).
- **Shipments Module:** CRUD screens for listing (`ShipmentList.jsx`), detail view, creation, bulk CSV upload, and simulation assistant.

### 5.2 Server (`server/`)
- **Startup (`index.js`):**
  - Loads env, configures CORS with explicit whitelist and dev bypass, attaches JSON parser and helmet.
  - Optional rate limiter active outside development.
  - Tries to connect to Mongo; logs and continues in degraded mode if unavailable.
  - Health root endpoint reports API and database status.
  - `/api/infer` proxies client payloads to `http://127.0.0.1:8000/infer_live`, writes combined request/response into `history` collection when Mongo connected.
- **Auth & Access Control:**
  - `routes/auth.js` covers register/login/me. Guarded by direct DB checks; registration disabled when Mongo absent.
  - JWT middleware (`middleware/auth.js`) attaches decoded user (id/email/role) to `req.user`. `requireRole` helper supports multi-role gating.
- **Domain Modules:**
  - `routes/shipments.js` orchestrates shipment lifecycle:
    - Creation triggers model inference call, optionally adds weather (via `services/weatherService.js`), persists AI recommendation and environmental metadata.
    - Manager approval workflow permits overrides with rationale; notifications + email triggers on status change.
    - Feedback endpoint (`POST /:id/feedback`) stores shipment-level comments.
    - Statistics endpoint aggregates performance across time window (with multi-tenant filtering).
  - `routes/admin.js`: admin insights (user management, role assignments).
  - `routes/notifications.js`: fetch/update user notifications.
  - `routes/reports.js`: aggregated analytics and CSV exports.
- **Models (`server/models/*.js`):**
  - Lightweight classes around Mongo collections (Users, Shipments, Notifications, Feedback).
  - All data operations return plain objects; no Mongoose/ODM layering.
  - Multi-tenant support via `companyId` field on users/shipments.
- **Services:**
  - `weatherService.js`: rate-limited geocoding (OpenStreetMap Nominatim) + Open-Meteo fetch with timeouts and retries.
  - `emailService.js`: nodemailer transporter (configuration driven by env) for sending shipment and approval notifications.
  - `scheduler.js`: sets up weekly summary job when Mongo is connected, using `node-cron` (internally) to email reports.
- **Scripts:** `scripts/fix-shipment-userids.js` for data migrations of inconsistent user references.

### 5.3 Model Service (`model_service/`)
- **App (`main.py`):** Minimal FastAPI app with CORS for local clients; exposes `/infer_live` POST → `sim_inference.infer_live`.
- **Inference Pipeline (`sim_inference.py`):**
  1. **Model Loading:**
     - Loads ensemble of three simulator checkpoints (`sim_v40_seed*.pth`) and actor network (`actor_best_v40.pth`) at import time.
     - Device auto-select (CUDA if available).
     - Restores feature/target scalers and mode labels from checkpoint metadata.
  2. **Feature Engineering:**
     - Fetches route distance/duration via Mapbox Directions Matrix, caching results to `models/api_cache.csv`. Fallback to random simulated distances on failure or missing API key.
     - Retrieves weather score through Open-Meteo live API (normalized metric). Fallback generates random value within [0.5,1.0].
     - Computes fuel index from EIA API (WTI crude series). If API key absent or call fails, uses Gaussian perturbation fallback.
     - Derives inferred shipment weight from `sales_per_customer`.
  3. **Simulation:**
     - Normalizes features with loaded scalers, replicates sequence to expected temporal length `T=5`.
     - For each transport mode (`Standard`, `Air`, `Ship`, `Rail`), runs Monte Carlo ensemble simulation (`ENSEMBLE_K=3`, `MC_SAMPLES=8`) to obtain predictive distribution (mean/std for delay, profit, CO₂).
     - Computes adaptive reward weights based on live weather and fuel signals, scoring each mode for decision support.
  4. **Policy Evaluation:**
     - Actor network infers mode probabilities; best score (simulator) and actor choice both returned for transparency.
  5. **Response Payload:**
     ```
     {
       "best_mode_by_score": "Air",
       "best_score": 0.742,
       "actor_policy_choice": "Standard",
       "actor_probs": {"Standard": 0.51, ...},
       "per_mode_analysis": [
         {"mode": "Standard", "score": ..., "pred_delay": ..., "std_delay": ..., ...},
         ...
       ],
       "live_features": {"km": 820.1, "ws": 0.83, "fi": 1.02, "weight": 8.5},
       "live_weights": [0.72, 0.47, 0.28, 0.13]
     }
     ```
  - Verbose logging aids debugging (distinguishes live vs fallback data sources).
- **Deployment Scripts:** `run.sh` / `run.bat` launch Uvicorn with autoreload. `requirements.txt` pins PyTorch CPU version; GPU support depends on environment.

---

## 6. Data Model & Persistence
- **Mongo Collections (when enabled):**
  - `users`: fields `{ name, email, passwordHash, role, companyId, preferences, createdAt, lastLogin, isActive }`.
  - `shipments`: stores origin/destination descriptors, derived features (`distance`, `weatherScore`, `fuelIndex`), AI recommendation, weather snapshots, coordinates, status workflow, feedback array.
  - `notifications`: typed alerts (shipment_created/approved/etc.) tied to `userId`, severity, read-state, recipients.
  - `history`: raw request/response pairs from inference endpoint (for auditing).
  - `feedback`: embedded within shipments (no separate collection).
- **Indexes:** Not explicitly defined; Mongo driver uses default `_id` indexes. For production scale, add compound indexes (e.g., `companyId`, `createdAt`).
- **Cache (`models/api_cache.csv`):** Append-only CSV storing `{orig, dest, distance_km, duration_hr}` to minimize Mapbox API calls. Managed automatically.

---

## 7. External Integrations
- **Mapbox (Geocoding + Directions Matrix):** API key set near top of `sim_inference.py`. Provides live distance estimates; fallbacks maintain functionality without key (simulated values).
- **Open-Meteo:** No API key required; used by both model service and backend weather service.
- **EIA (Energy Information Administration):** Fuel price index; configure `EIA_API_KEY` via environment var.
- **OpenStreetMap Nominatim:** Geocoding in backend weather service (requires respectful User-Agent and throttling).
- **Email (SMTP):** `emailService.js` expects env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`). Used for shipment alerts and weekly reports.

---

## 8. Background Jobs & Notifications
- `services/scheduler.js` registers a weekly cron when Mongo is connected, generating and emailing summary reports (shipments, approvals, anomalies).
- Notifications pipeline:
  1. Shipment creation: push notification to managers + optional email.
  2. Shipment approval: notify operators and send email if opted-in.
  3. Additional triggers (reports, insights) integrated through scheduler.
- Notification preferences stored per user (`preferences.emailNotify`, `preferences.pushNotify`).

---

## 9. Security & Access Control
- JWT tokens issued for 7 days; stored in localStorage (SPA). Re-auth on load checks token validity.
- `ProtectedRoute` component verifies presence of `user` and optional `allowedRoles`.
- Express middleware enforces role access server-side. Most CRUD endpoints require both authentication and role validation.
- CORS configured for known clients; development mode bypasses dynamic origin checks.
- Helmet enables sensible HTTP headers; rate limiter applies in production to `/api/*`.

---

## 10. Error Handling & Resilience
- Server gracefully degrades without MongoDB: auth routes respond with 503 for data-dependent operations, but inference proxy remains operational.
- ML service wraps external API calls with try/except, logging failures and reverting to random-but-bounded fallback values to keep inference responsive.
- Weather service uses timeouts, retries, and sequential throttling to respect third-party rate limits.
- Error middleware at end of `server/index.js` normalizes JSON parse failures and returns structured error payloads.
- Shipment routes wrap external calls in nested try/catch to ensure user-facing flow does not break due to weather/API outages.

---

## 11. Deployment Considerations
- **Ports:** Client 5173, Server 5000, Model service 8000. Update CORS/allowed origins if deploying under custom domains.
- **Environment Separation:** `NODE_ENV=development` disables rate limiting. Production should set `JWT_SECRET`, `CLIENT_URL`, secure SMTP credentials, and Mapbox/EIA keys.
- **Hosting Strategy:** Each service deployable independently (e.g., client on static hosting, server on Node-compatible host, model service on Python host with GPU if available). Ensure server can reach model service over network and vice versa.
- **Logging:** Console-based. For production, route logs to centralized system (e.g., Winston for Node, logging.handlers for Python).

---

## 12. Known Limitations & Future Enhancements
- No automated unit/integration tests; reliability relies on manual smoke testing.
- Mongo indexes and migrations not formalized; consider scripts for seeding roles/users.
- Inference fallbacks introduce randomness when external APIs unavailable—results may vary between runs.
- API base URLs in client currently point to Render-hosted server (`https://sim-dec-server2.onrender.com`); update for local or new deployments.
- Weather/fuel integrations rely on public endpoints; hitting rate limits can degrade data fidelity (but not service availability).
- `models/api_cache.csv` grows unbounded; periodic pruning (or DB-backed cache) recommended for long-term ops.

---

## 13. Quick Reference
- **Services:** `client/` (UX) → `server/` (REST + persistence) → `model_service/` (ML inference).
- **Primary API Path:** client `POST /api/infer` → server proxy → model service `/infer_live`.
- **Key Roles:** `operator` (create shipments), `manager` ( approve/override), `analyst` (analytics dashboards), `admin` (user/org management).
- **Critical Assets:** PyTorch checkpoints (`model_service/models/*.pth`), `.env` secrets, `models/api_cache.csv` cache, MongoDB data.

---

By understanding each layer—React UI, Express gateway, FastAPI + PyTorch inference—and the supporting services (Mongo, Mapbox, weather, email), contributors can extend the platform confidently (e.g., adding transport modes, integrating new data feeds, or enhancing analytics). Refer back to this document when evaluating impact across services or onboarding new engineers.


