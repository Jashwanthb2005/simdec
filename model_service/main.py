from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from sim_inference import infer_live

app = FastAPI(title="Sim-to-Dec ML API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/infer_live")
def infer_live_api(payload: dict = Body(...)):
    return infer_live(
        order_city=payload["order_city"],
        order_country=payload["order_country"],
        customer_city=payload["customer_city"],
        customer_country=payload["customer_country"],
        sales_per_customer=payload["sales_per_customer"],
        lat=payload.get("lat"),
        lon=payload.get("lon")
    )

@app.get("/health")
def health():
    return {"status": "ready"}
