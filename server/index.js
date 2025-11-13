const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { MongoClient } = require("mongodb");
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "https://sim-dec-client.onrender.com",
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// JSON body parser - standard configuration
app.use(express.json());

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 requests per minute (more lenient)
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development mode
    return process.env.NODE_ENV === "development";
  },
});

// Apply rate limiting only in production
if (process.env.NODE_ENV !== "development") {
  app.use("/api/", limiter);
}

let mongo = null;
let db = null;
let mongoConnected = false;

async function init() {
  try {
    if (process.env.MONGO_URI) {
      mongo = new MongoClient(process.env.MONGO_URI);
      await mongo.connect();
      db = mongo.db("simtodec");
      mongoConnected = true;
      console.log("✅ MongoDB connected");
    } else {
      console.log("⚠️  MongoDB URI not set. Continuing without database.");
      console.log("⚠️  Some features will not work without MongoDB.");
    }
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Check if MongoDB is installed");
    console.log("   2. Start MongoDB service");
    console.log("   3. Verify connection string in .env file");
    mongoConnected = false;
  }
}

// Initialize database and routes
init().then(() => {
  // Setup scheduler for weekly reports
  if (mongoConnected && db) {
    const { setupScheduler } = require("./services/scheduler");
    setupScheduler(db);
  }

  // Health check
  app.get("/", (_, res) => res.json({ 
    message: "🚀 Sim-to-Dec API running",
    status: "healthy",
    database: mongoConnected ? "connected" : "disconnected"
  }));

  // Legacy endpoint for backward compatibility
  app.post("/api/infer", async (req, res) => {
    try {
      const fetch = (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

      const response = await fetch("http://127.0.0.1:8000/infer_live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();

      if (mongoConnected && db) {
        try {
          await db.collection("history").insertOne({
            ...req.body,
            ...data,
            created_at: new Date(),
          });
        } catch (dbErr) {
          console.warn("⚠️  Could not save to database:", dbErr.message);
        }
      }

      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Inference failed" });
    }
  });

  // Setup routes - auth routes work without DB, others require DB
  const setupAuthRoutes = require("./routes/auth");
  app.use("/api/auth", setupAuthRoutes(db)); // Pass db even if null

  // Setup routes that require database
  if (mongoConnected && db) {
    const setupShipmentRoutes = require("./routes/shipments");
    const setupAdminRoutes = require("./routes/admin");
    const setupNotificationRoutes = require("./routes/notifications");
    const setupReportRoutes = require("./routes/reports");

    app.use("/api/shipments", setupShipmentRoutes(db));
    app.use("/api/admin", setupAdminRoutes(db));
    app.use("/api/notifications", setupNotificationRoutes(db));
    app.use("/api/reports", setupReportRoutes(db));
    
    console.log("✅ All routes initialized");
  } else {
    console.log("⚠️  Shipment and Admin routes not initialized - MongoDB not connected");
    console.log("✅ Auth routes available (limited functionality)");
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Node backend running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  });
});

// Error handling middleware - must be after all routes
app.use((err, req, res, next) => {
  // Handle JSON parse errors (including null/empty body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.warn('JSON parse error:', err.message);
    // For null body errors, set empty object and continue to route handler
    if (err.message && (err.message.includes('null') || err.message.includes('Unexpected token'))) {
      req.body = {};
      // Re-route to the original handler (this is a workaround)
      // Actually, we can't re-route easily, so return a proper error response
      return res.status(400).json({ 
        error: 'Invalid request body',
        message: 'Request body cannot be null. Please send an empty object {} instead.'
      });
    }
    return res.status(400).json({ 
      error: 'Invalid JSON in request body',
      message: err.message 
    });
  }
  
  // Handle other errors
  console.error("Error:", err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({ 
    error: err.message || "Internal server error" 
  });
});
