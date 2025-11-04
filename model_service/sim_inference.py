import os
import time
import math
import random
import warnings
import requests
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset
from collections import defaultdict

warnings.filterwarnings("ignore")

# ----------------------------
# Config / Paths
# ----------------------------
SEED = 42
# --- We comment out the seeds to allow for different results each run ---
# np.random.seed(SEED)
# random.seed(SEED)
# torch.manual_seed(SEED)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# --- SET YOUR FILE PATHS HERE ---
# Path to your simulator ensemble checkpoints
CKPTS = [
    "models/sim_v40_seed0.pth",
    "models/sim_v40_seed1.pth",
    "models/sim_v40_seed2.pth"
]
# Path to your best actor model
BEST_ACTOR = "models/actor_best_v40.pth"
# Path to your API cache file
CACHE_FILE = "models/api_cache.csv"
# ---------------------------------

# Model hyperparams (must match training)
ENSEMBLE_K = 3
MC_SAMPLES = 8
T = 5 # Sequence length
F_COLS = 5 # Number of features (feat_dim)
N_MODES = 4 # Number of actions
N_TARGETS = 3 # Number of outputs (Delay, Profit, CO2)

# Global placeholders for scalers and modes (will be loaded from checkpoints)
saved_sx_mean = np.zeros(F_COLS)
saved_sx_scale = np.ones(F_COLS)
saved_sy_mean = np.zeros(N_TARGETS)
saved_sy_scale = np.ones(N_TARGETS)
modes = ['Standard', 'Air', 'Ship', 'Rail'] # Default, will be loaded

# ----------------------------
# 1) API Helper Functions (with Mapbox & Live EIA Fuel)
# ----------------------------

# --- ADD YOUR MAPBOX TOKEN HERE ---
MAPBOX_API_KEY = "pk.eyJ1IjoiZ3Jvb3RpeCIsImEiOiJjbWhpMHN0bnYwY3Z5Mmpxd2tjamhqdzg0In0.Pco0PmEXYLRIgQQle1KxhQ" # <<< PUT YOUR KEY HERE
# ------------------------------------

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def _get_mapbox_coords(place_name, api_key):
    """
    Helper function to turn a place name (e.g., "Bengaluru, India") 
    into coordinates (e.g., "77.59,12.97").
    """
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{requests.utils.quote(place_name)}.json"
    params = {
        "access_token": api_key,
        "limit": 1
    }
    try:
        r = requests.get(url, params=params, timeout=6).json()
        coords = r['features'][0]['center']
        # Mapbox returns [lon, lat], format for matrix is "lon,lat"
        lon, lat = coords[0], coords[1]
        print(f"DEBUG (Geocode): Converted '{place_name}' -> Coords: {lon},{lat}")
        return f"{lon},{lat}"
    except Exception as e:
        print(f"DEBUG (Geocode): FAILED for '{place_name}'. Error: {e}")
        return None

def fetch_distance_cached(orig, dest, api_key):
    """
    Returns (km, hours) using Mapbox Matrix API.
    Caches results to CSV to avoid repeated API calls.
    """
    print(f"\nDEBUG (Distance): Checking cache for route {orig} -> {dest}")
    if os.path.exists(CACHE_FILE):
        cache = pd.read_csv(CACHE_FILE)
    else:
        cache = pd.DataFrame(columns=['orig','dest','distance_km','duration_hr'])
    
    found = cache[(cache.orig == orig) & (cache.dest == dest)]
    if not found.empty:
        r = found.iloc[0]
        print(f"DEBUG (Distance): Found in cache. Using cached value: {r.distance_km:.1f} km")
        return float(r.distance_km), float(r.duration_hr)

    print(f"DEBUG (Distance): Not in cache. Attempting geocoding...")
    if not api_key or api_key == "pk.YOUR_DEFAULT_PUBLIC_TOKEN_HERE":
        print("DEBUG (Distance): Mapbox API key is missing or is the placeholder.")
        print("DEBUG (Distance): Using random FALLBACK distance.")
        return float(np.random.uniform(300, 1500)), float(np.random.uniform(5, 25))

    # 1. Geocode origin and destination
    orig_coords = _get_mapbox_coords(orig, api_key)
    dest_coords = _get_mapbox_coords(dest, api_key)
    
    if not orig_coords or not dest_coords:
        print("DEBUG (Distance): Geocoding failed. Using random FALLBACK distance.")
        return float(np.random.uniform(300, 1500)), float(np.random.uniform(5, 25))

    # 2. Call Mapbox Matrix API
    # Format: {lon,lat;lon,lat}
    coordinates = f"{orig_coords};{dest_coords}"
    matrix_url = f"https://api.mapbox.com/directions-matrix/v1/mapbox/driving/{coordinates}"
    
    params = {
        "access_token": api_key,
        "annotations": "distance,duration"
    }
    
    print(f"DEBUG (Distance): Attempting live Matrix API call...")
    try:
        r = requests.get(matrix_url, params=params, timeout=8).json()
        
        if r.get('code') != 'Ok':
            print(f"DEBUG (Distance): Mapbox API returned an error: {r.get('message', 'Unknown error')}")
            raise Exception(r.get('message'))

        dist_meters = r['distances'][0][1]
        dist_km = dist_meters / 1000.0
        dur_seconds = r['durations'][0][1]
        dur_hours = dur_seconds / 3600.0
        
        print(f"DEBUG (Distance): Live API SUCCESS. Distance = {dist_km:.1f} km, Duration = {dur_hours:.1f} hr")
        
        # Save to cache
        new_row = pd.DataFrame({'orig': [orig], 'dest': [dest], 'distance_km': [dist_km], 'duration_hr': [dur_hours]})
        cache = pd.concat([cache, new_row], ignore_index=True)
        cache.to_csv(CACHE_FILE, index=False)
        print("DEBUG (Distance): Saved new value to cache.")
        return float(dist_km), float(dur_hours)
        
    except Exception as e:
        print(f"DEBUG (Distance): Mapbox API call FAILED. Error: {e}")
        
    print("DEBUG (Distance): Using random FALLBACK distance.")
    dist_fallback = float(np.random.uniform(300, 1500))
    dur_fallback = dist_fallback / float(np.random.uniform(50, 80))
    return dist_fallback, dur_fallback

def get_weather_score(lat=20.0, lon=78.0):
    """Lightweight Open-Meteo call (current weather -> normalized [0,1] score)."""
    print(f"\nDEBUG (Weather): Attempting live API call for lat={lat}, lon={lon}")
    try:
        r = requests.get(OPEN_METEO_URL, params={"latitude":lat,"longitude":lon,"current_weather":True}, timeout=6).json()
        cw = r.get("current_weather", {})
        temp = cw.get("temperature", 25.0)
        wind = cw.get("windspeed", 5.0)
        
        print(f"DEBUG (Weather): Live API SUCCESS. Temp={temp}°C, Wind={wind} km/h")
        score = 1.0 - np.tanh(abs(temp - 20.0)/20.0)*0.6 - np.tanh(wind/20.0)*0.4
        print(f"DEBUG (Weather): Calculated score = {score:.3f}")
        return float(np.clip(score, 0.0, 1.0))
        
    except Exception as e:
        print(f"DEBUG (Weather): API call FAILED. Error: {e}. Using random score.")
        return float(np.random.uniform(0.5, 1.0))

def get_fuel_index():
    """
    Fetches the live price of WTI Crude oil from the U.S. EIA
    to create a fuel price index.
    """
    print(f"\nDEBUG (Fuel): Fetching fuel index...")
    
    # --- !! PASTE YOUR EIA API KEY HERE !! ---
    # (Get one from https://www.eia.gov/developer/)
    EIA_API_KEY = os.getenv("EIA_API_KEY", "HxuVEQMOntObfyKaWNom8SM98bpqu3dC3ibwVoeK")
    # ---------------------------------

    try:
        if EIA_API_KEY and EIA_API_KEY != "YOUR_FREE_EIA_KEY_HERE":
            # This is the new, live API call to the EIA
            # This specific series_id is for "WTI Crude Oil Price"
            series_id = "PET.RWTC.D"
            url = f"https://api.eia.gov/v2/seriesid/{series_id}"
            
            params = {
                'api_key': EIA_API_KEY,
                'length': 1  # Get only the single most recent data point
            }
            
            print("DEBUG (Fuel): Calling live EIA.gov API...")
            r = requests.get(url, params=params, timeout=6).json()
            
            # The EIA response is nested
            if r.get('response') and r['response'].get('data'):
                price = r['response']['data'][0]['value']
                date = r['response']['data'][0]['period']
                print(f"DEBUG (Fuel): Live API SUCCESS. Current WTI Price = ${price:.2f} (as of {date})")
                
                # Use the same baseline (70) as your original simulation
                index = float(np.clip(1.0 + (price - 70.0) / 200.0, 0.9, 1.1))
                return index
            else:
                print(f"DEBUG (Fuel): API call failed. Error: {r.get('error', 'Unknown response format')}")
                raise Exception("API call failed")

        # Fallback: if no key, use the original simulation
        print("DEBUG (Fuel): API key not found or is placeholder. Using simulated fallback.")
        price = 70.0 + np.random.randn() * 2.0
        index = float(np.clip(1.0 + (price - 70.0) / 200.0, 0.9, 1.1))
        print(f"DEBUG (Fuel): Using simulated fallback. Price={price:.2f}, Index={index:.3f}")
        return index
        
    except Exception as e:
        print(f"DEBUG (Fuel): API call FAILED. Error: {e}. Using random index.")
        return float(np.random.uniform(0.95, 1.05))

# ----------------------------
# 2) Model Class Definitions
# ----------------------------
class Simulator(nn.Module):
    # CRITICAL FIX: Changed _init_ to __init__
    def __init__(self, feat_dim, num_modes, emb_dim=8, hidden=64, out_dim=3, dropout=0.25):
        super().__init__()
        self.emb = nn.Embedding(num_modes, emb_dim)
        self.lstm = nn.LSTM(feat_dim + emb_dim, hidden, batch_first=True, bidirectional=True)
        self.norm = nn.LayerNorm(hidden*2)
        self.drop = nn.Dropout(dropout)
        self.fc_mu = nn.Linear(hidden*2, out_dim)
        self.fc_lv = nn.Linear(hidden*2, out_dim)
        
    def forward(self, x_seq, mode_idx):
        emb = self.emb(mode_idx).unsqueeze(1).repeat(1, x_seq.size(1), 1)
        x_in = torch.cat([x_seq, emb], dim=-1)
        out, _ = self.lstm(x_in)
        h = self.drop(self.norm(out.mean(dim=1)))
        return self.fc_mu(h), self.fc_lv(h)

class ActorNet(nn.Module):
    # CRITICAL FIX: Changed _init_ to __init__
    def __init__(self, state_dim, hidden=128, n_actions=4, dropout=0.2):
        super().__init__()
        self.fc1 = nn.Linear(state_dim, hidden)
        self.ln = nn.LayerNorm(hidden)
        self.drop = nn.Dropout(dropout)
        self.fc2 = nn.Linear(hidden, n_actions)

    def forward(self, x):
        h = F.relu(self.ln(self.fc1(x)))
        h = self.drop(h)
        logits = self.fc2(h)
        probs = F.softmax(logits, dim=-1)
        return probs, logits

class CriticNet(nn.Module):
    # CRITICAL FIX: Changed _init_ to __init__
    def __init__(self, state_dim, hidden=128, dropout=0.2):
        super().__init__()
        self.fc1 = nn.Linear(state_dim, hidden)
        self.ln = nn.LayerNorm(hidden)
        self.drop = nn.Dropout(dropout)
        self.v = nn.Linear(hidden, 1)

    def forward(self, x):
        h = F.relu(self.ln(self.fc1(x)))
        h = self.drop(h)
        return self.v(h).squeeze(-1)

# ----------------------------
# 3) Core Prediction & Logic Functions
# ----------------------------

def sy_inverse_transform(arr_norm):
    """Applies inverse scaling to the normalized simulator outputs."""
    return arr_norm * saved_sy_scale[None, :] + saved_sy_mean[None, :]

def mc_ensemble_predict_batch(xb_tensor, mi_tensor, K=ENSEMBLE_K, mc=MC_SAMPLES):
    """Runs MC-Dropout + Ensemble prediction."""
    all_mus = []
    all_vars = []
    for s in range(K):
        sim = ensemble_sims[s]
        for _ in range(mc):
            with torch.no_grad():
                mu, lv = sim(xb_tensor, mi_tensor)
            all_mus.append(mu.cpu().numpy())
            all_vars.append(np.exp(lv.cpu().numpy()))
    
    mus = np.stack(all_mus, axis=0)
    vars_ = np.stack(all_vars, axis=0)
    
    mu_mean = mus.mean(axis=0) # Mean prediction
    total_var = vars_.mean(axis=0) + mus.var(axis=0) # Total uncertainty
    total_std = np.sqrt(total_var)
    
    return mu_mean, total_std

def env_step_sample(x_feat_np, mode_idx_np, K=ENSEMBLE_K, mc=MC_SAMPLES):
    """Simulates one step, returns real-world values."""
    xb = torch.tensor(x_feat_np, dtype=torch.float32).to(device)
    mi = torch.tensor(mode_idx_np, dtype=torch.long).to(device)
    
    mu_norm, std_norm = mc_ensemble_predict_batch(xb, mi, K=K, mc=mc)
    
    mu_rescaled = sy_inverse_transform(mu_norm)
    std_rescaled = std_norm * saved_sy_scale[None, :]
    
    sampled = mu_rescaled + np.random.randn(*mu_rescaled.shape) * std_rescaled
    return sampled, std_rescaled, mu_rescaled

def adaptive_weights(weather, fuel):
    """Produces 4 weights (wd, wp, wc, wu) normalized and scaled."""
    w_d = 0.5 + 0.3 * (1 - weather)
    w_p = 0.6 - 0.3 * (fuel - 1.0)
    w_c = 0.3 + 0.2 * (fuel - 1.0)
    w_u = 0.2 + 0.1 * (1 - weather)
    
    s = w_d + w_p + w_c + w_u + 1e-8
    return (w_d / s * 1.6, w_p / s * 1.6, w_c / s * 1.6, w_u / s * 1.6)

def compute_reward(outcome_orig, std_rescaled, weights):
    """Calculates the adaptive reward based on outcomes and uncertainty."""
    delay_scale = 10.0 
    profit_scale = 200.0
    co2_scale = 5000.0

    wd, wp, wc, wu = weights
    d = outcome_orig[:, 0]
    p = outcome_orig[:, 1]
    c = outcome_orig[:, 2]
    sd = std_rescaled[:, 0]
    sp = std_rescaled[:, 1]
    sc = std_rescaled[:, 2]
    
    r_delay = 1.0 / (1.0 + np.clip(d, 0, None) / delay_scale)
    r_profit = p / (profit_scale + 1e-6)
    r_co2 = - (c) / (co2_scale + 1e-6)
    
    unc = (sd / delay_scale + sp / profit_scale + sc / co2_scale)
    
    return wd * r_delay + wp * r_profit + wc * r_co2 - wu * unc

def state_from_seq(x_seq_np):
    """Averages sequence data to create a state for the Actor/Critic."""
    return x_seq_np.mean(axis=1)

# ----------------------------
# 4) Model & Scaler Loading
# ----------------------------

print("Loading models and scalers...")

# --- Load Simulator Ensemble ---
ensemble_sims = []
try:
    for p in CKPTS:
        if not os.path.exists(p):
            print(f"FATAL: Checkpoint file not found: {p}")
            print("Please train the models first or update the CKPTS path.")
            exit()
            
        ck = torch.load(p, map_location=device, weights_only=False)
        sim = Simulator(F_COLS, N_MODES).to(device)
        sim.load_state_dict(ck['model_state'])
        
        sim.train() 
        ensemble_sims.append(sim)
        
        if 'sx_mean' not in locals() or saved_sx_mean is None:
            saved_sx_mean = np.array(ck['sx_mean'])
            saved_sx_scale = np.array(ck['sx_scale'])
            saved_sy_mean = np.array(ck['sy_mean'])
            saved_sy_scale = np.array(ck['sy_scale'])
            modes = ck['modes']
            N_MODES = len(modes)
            print(f"Loaded {len(modes)} modes: {modes}")
            print(f"Loaded feature scaler (sx) mean: {saved_sx_mean}")
            print(f"Loaded target scaler (sy) mean: {saved_sy_mean}")

    print(f"✓ {len(ensemble_sims)} simulator models loaded.")

    # --- Load Actor Network ---
    if not os.path.exists(BEST_ACTOR):
        print(f"FATAL: Actor file not found: {BEST_ACTOR}")
        print("Please train the models first or update the BEST_ACTOR path.")
        exit()

    actor = ActorNet(state_dim=F_COLS, n_actions=N_MODES).to(device)
    actor.load_state_dict(torch.load(BEST_ACTOR, map_location=device))
    actor.eval()

    print("✓ Actor model loaded.")

except Exception as e:
    print(f"FATAL: Error during model loading: {e}")
    print("This often happens if the model architecture in this script does not")
    print("match the architecture of the saved models (e.g., wrong hidden size),")
    print("or if you still have an __init__ typo in this script.")
    exit()
    
# ----------------------------
# 5) Live Inference Function
# ----------------------------

def infer_live(order_city, order_country, customer_city, customer_country, sales_per_customer, lat=None, lon=None):
    """
    Runs a live inference for a single shipment.
    Fetches live data, scales features, and evaluates all shipping modes.
    """
    print(f"\n--- New Shipment ---")
    print(f"From: {order_city}, {order_country}")
    print(f"To:   {customer_city}, {customer_country}")
    print("Fetching live data for new shipment...")
    
    # 1. Fetch live features
    km, dur = fetch_distance_cached(f"{order_city},{order_country}", f"{customer_city},{customer_country}", MAPBOX_API_KEY)
    ws = get_weather_score(lat if lat is not None else 20.0, lon if lon is not None else 78.0)
    fi = get_fuel_index()
    
    avg_sales_placeholder = 178.0 
    avg_weight_mult_placeholder = 3.0
    weight = sales_per_customer / avg_sales_placeholder * avg_weight_mult_placeholder
    mode_reliability = 0.9
    
    print(f"\nLive Features: Dist={km:.0f}km, Weather={ws:.2f}, FuelIdx={fi:.2f}, Weight={weight:.2f}kg")

    # 2. Build feature array
    feat = np.array([km, weight, ws, fi, mode_reliability], dtype=np.float32)
    
    # 3. Scale features
    feat_s = (feat - saved_sx_mean) / (saved_sx_scale + 1e-8)
    
    # 4. Create sequence
    seq = np.tile(feat_s, (T, 1))[None, :, :].astype(np.float32)

    # 5. Evaluate all possible actions
    best_mode = None
    best_score = -float('inf')
    per_mode_results = []
    
    live_weights = adaptive_weights(ws, fi)
    print(f"Live Weights (Delay, Profit, CO2, Unc): {[round(w, 2) for w in live_weights]}")

    print("\n--- Mode Evaluation ---")
    for i, m in enumerate(modes):
        sampled, std_rescaled, mu_rescaled = env_step_sample(seq, np.array([i]), K=ENSEMBLE_K, mc=MC_SAMPLES)
        score = compute_reward(mu_rescaled, std_rescaled, live_weights)[0]
        
        result = {
            "mode": m,
            "score": score,
            "pred_delay": mu_rescaled[0, 0],
            "std_delay": std_rescaled[0, 0],
            "pred_profit": mu_rescaled[0, 1],
            "std_profit": std_rescaled[0, 1],
            "pred_co2": mu_rescaled[0, 2],
            "std_co2": std_rescaled[0, 2],
        }
        per_mode_results.append(result)
        
        print(f"Mode: {m:15s} | Score: {score:7.3f} | "
              f"Delay: {result['pred_delay']:5.1f} (±{result['std_delay']:.1f}) | "
              f"Profit: {result['pred_profit']:6.1f} (±{result['std_profit']:.1f}) | "
              f"CO2: {result['pred_co2']:7.1f} (±{result['std_co2']:.1f})")

        if score > best_score:
            best_score = score
            best_mode = m
            
    # 6. Get Actor's choice
    with torch.no_grad():
        st = torch.tensor(state_from_seq(seq), dtype=torch.float32).to(device)
        probs_v, _ = actor(st)
        acts_v = torch.argmax(probs_v, dim=-1).cpu().numpy()
        actor_choice = modes[acts_v[0]]

    print("---")
    print(f"✅ Simulator's Optimal Mode (best score): {best_mode} (Score={best_score:.3f})")
    print(f"🤖 Actor's Learned Policy Choice:          {actor_choice}")
    print("---")
    
    return {
        "best_mode_by_score": best_mode,
        "best_score": best_score,
        "actor_policy_choice": actor_choice,
        "per_mode_analysis": per_mode_results,
        "live_features": {"km": km, "ws": ws, "fi": fi, "weight": weight},
        "live_weights": live_weights
    }

# # ----------------------------
# # 6) Example Inference Call
# # ----------------------------
# if __name__ == "__main__":
#     inference_live = True 

#     if inference_live:
#         print("Running LIVE inference example (will call APIs)...")
#         print("!! REMEMBER: Delete 'api_cache.csv' to force a new Mapbox API call. !!")
#         print("!! REMEMBER: Add your Mapbox AND EIA.gov API keys. !!")
        
#         results = infer_live(
#             order_city="Hyderabad",
#             order_country="India",
#             customer_city="Lucknow",
#             customer_country="India",
#             sales_per_customer=500.0,
#             lat=17.3, # Lat for Hyderabad
#             lon=78.4  # Lon for Hyderabad
#         )
        
#         print("\nFull results object:")
#         import json
#         print(json.dumps(results, indent=2))
        
#     else:
#         print("Set 'inference_live = True' to run the example.")