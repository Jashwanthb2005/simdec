# MongoDB Connection Setup Guide

## Why MongoDB Connection Might Fail

The MongoDB connection can fail for several reasons:

### 1. **No .env File**
If you don't have a `.env` file in the `server` directory, MongoDB won't attempt to connect. The server will continue to work without MongoDB (history just won't be saved).

### 2. **MongoDB Not Installed**
MongoDB needs to be installed on your system.

### 3. **MongoDB Not Running**
Even if MongoDB is installed, it needs to be running as a service.

### 4. **Incorrect Connection String**
The `MONGO_URI` in your `.env` file might be incorrect.

## Solutions

### Option 1: Use MongoDB Locally (Recommended for Development)

1. **Install MongoDB Community Server**
   - Download from: https://www.mongodb.com/try/download/community
   - Or use Chocolatey: `choco install mongodb`
   - Or use Homebrew (Mac): `brew install mongodb-community`

2. **Start MongoDB Service**
   - Windows: MongoDB should start automatically as a service
   - Mac/Linux: `brew services start mongodb-community` or `sudo systemctl start mongod`

3. **Create `.env` file in `server` directory:**
   ```env
   MONGO_URI=mongodb://localhost:27017
   PORT=5000
   ```

### Option 2: Use MongoDB Atlas (Cloud - Free Tier Available)

1. **Create a free account at**: https://www.mongodb.com/cloud/atlas

2. **Create a cluster** (free tier M0)

3. **Get your connection string** from the Atlas dashboard

4. **Create `.env` file in `server` directory:**
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   PORT=5000
   ```
   Replace `username` and `password` with your Atlas credentials.

### Option 3: Skip MongoDB (Simplest)

The application works **without MongoDB**. Just don't create a `.env` file, and the server will skip database operations. History won't be saved, but all other features work.

## Verifying MongoDB Connection

1. **Check if MongoDB is running:**
   ```powershell
   # Windows
   Get-Service MongoDB
   
   # Or check if process is running
   Get-Process mongod -ErrorAction SilentlyContinue
   ```

2. **Test connection manually:**
   ```powershell
   # If MongoDB is installed locally
   mongosh "mongodb://localhost:27017"
   ```

3. **Check server logs:**
   When you start the server, you should see either:
   - `✅ MongoDB connected` (success)
   - `⚠️ MongoDB URI not set` (no .env file)
   - `❌ MongoDB connection failed: [error message]` (connection failed)

## Common Error Messages

- **"MongoServerError: connect ECONNREFUSED"**: MongoDB is not running
- **"MongoServerError: Authentication failed"**: Wrong username/password in connection string
- **"MongoServerError: timeout"**: Firewall blocking connection or wrong host/port

## Quick Start (No MongoDB)

If you just want to get started quickly without setting up MongoDB:

1. **Don't create a `.env` file** in the server directory
2. The server will work fine, just without history saving
3. All API endpoints will work normally

