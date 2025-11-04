# MongoDB Connection Issue - Quick Fix

## Problem
MongoDB connection is failing because the MongoDB service is **stopped**.

## Solution Options

### Option 1: Start MongoDB Service (Requires Admin)

**Run PowerShell as Administrator**, then:

```powershell
# Start MongoDB service
Start-Service MongoDB

# Verify it's running
Get-Service MongoDB
```

If you get a permission error, you need to:
1. Right-click PowerShell
2. Select "Run as Administrator"
3. Then run the command above

### Option 2: Start MongoDB Manually (No Admin Needed)

You can start MongoDB directly without the service:

```powershell
# Navigate to MongoDB bin directory
cd "C:\Program Files\MongoDB\Server\8.0\bin"

# Start MongoDB (this will keep the terminal open)
.\mongod.exe
```

Leave this terminal window open while using the application.

### Option 3: Run Without MongoDB (Simplest)

The application works **perfectly fine without MongoDB**! Just remove or comment out the MONGO_URI in your `.env` file:

**Edit `server/.env`:**
```env
# MONGO_URI=mongodb://127.0.0.1:27017/
PORT=5000
```

Or delete the `.env` file entirely. The server will continue without MongoDB - history just won't be saved.

## Verification

After starting MongoDB, restart your server and you should see:
```
✅ MongoDB connected
```

Instead of:
```
❌ MongoDB connection failed: ...
```

## Current Status

- ✅ MongoDB is installed: `C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe`
- ❌ MongoDB service is stopped
- ✅ `.env` file exists with correct connection string

**Recommendation**: If you don't need to save history right now, use Option 3 (run without MongoDB) for the quickest solution.

