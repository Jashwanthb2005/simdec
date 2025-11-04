const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");

function setupAdminRoutes(db) {
  const User = require("../models/User");
  const Shipment = require("../models/Shipment");
  const userModel = new User(db);
  const shipmentModel = new Shipment(db);

  // Get all users (Admin only)
  router.get("/users", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const users = await userModel.getAllUsers();
      res.json({ users });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user role
  router.put("/users/:id/role", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const { role } = req.body;
      if (!["manager", "operator", "analyst", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const user = await userModel.update(req.params.id, { role });
      res.json({ message: "User role updated", user });
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get system statistics
  router.get("/stats", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const users = await userModel.getAllUsers();
      const shipments = await shipmentModel.getAll(1000, 0);

      const stats = {
        totalUsers: users.length,
        usersByRole: {
          manager: users.filter((u) => u.role === "manager").length,
          operator: users.filter((u) => u.role === "operator").length,
          analyst: users.filter((u) => u.role === "analyst").length,
          admin: users.filter((u) => u.role === "admin").length,
        },
        totalShipments: shipments.length,
        shipmentsByStatus: {
          pending: shipments.filter((s) => s.status === "pending").length,
          approved: shipments.filter((s) => s.status === "approved").length,
          completed: shipments.filter((s) => s.status === "completed").length,
        },
      };

      res.json({ stats });
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Model monitoring endpoint
  router.get("/model/status", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const fetch = (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

      try {
        const response = await fetch("http://127.0.0.1:8000/health");
        const data = await response.json();
        res.json({
          status: "healthy",
          modelService: data,
          timestamp: new Date(),
        });
      } catch (error) {
        res.json({
          status: "unhealthy",
          error: error.message,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Model status check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Retrain AI model endpoint
  router.post("/model/retrain", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      // In a real implementation, this would:
      // 1. Collect feedback data from shipments
      // 2. Trigger model retraining service
      // 3. Monitor training progress
      // 4. Deploy new model when ready
      
      const shipments = await shipmentModel.getAll(1000, 0);
      const feedbackCount = shipments.reduce((count, s) => {
        return count + (s.feedback?.length || 0);
      }, 0);

      // Log retraining action
      console.log(`[${new Date().toISOString()}] Admin ${req.user.id} triggered model retraining with ${feedbackCount} feedback samples`);

      res.json({
        message: "Model retraining initiated",
        status: "training",
        feedbackSamples: feedbackCount,
        estimatedTime: "15-30 minutes",
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Model retrain error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get API logs
  router.get("/logs", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      
      // In a real implementation, this would read from a log file or database
      // For now, we'll return recent activity based on shipments
      const shipments = await shipmentModel.getAll(limit, 0);
      
      const logs = shipments.map((s) => ({
        timestamp: s.createdAt,
        action: "shipment_created",
        user: s.createdBy,
        details: {
          route: `${s.origin} → ${s.destination}`,
          aiMode: s.aiRecommendation?.mode,
          status: s.status,
        },
      }));

      // Add approval logs
      const approvedShipments = shipments.filter((s) => s.approvedAt);
      approvedShipments.forEach((s) => {
        logs.push({
          timestamp: s.approvedAt,
          action: s.managerOverride ? "shipment_approved_with_override" : "shipment_approved",
          user: s.approvedBy,
          details: {
            route: `${s.origin} → ${s.destination}`,
            originalMode: s.aiRecommendation?.mode,
            finalMode: s.finalMode || s.aiRecommendation?.mode,
            override: s.managerOverride ? {
              reason: s.managerOverride.overrideReason,
              mode: s.managerOverride.overrideMode,
            } : null,
          },
        });
      });

      // Sort by timestamp descending
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json({
        logs: logs.slice(0, limit),
        total: logs.length,
      });
    } catch (error) {
      console.error("Get logs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = setupAdminRoutes;

