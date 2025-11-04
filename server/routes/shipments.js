const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");

function setupShipmentRoutes(db) {
  const Shipment = require("../models/Shipment");
  const shipmentModel = new Shipment(db);

  // Create shipment
  router.post("/create", authenticateToken, async (req, res) => {
    try {
      const {
        order_city,
        order_country,
        customer_city,
        customer_country,
        sales_per_customer,
        urgency,
        notes,
      } = req.body;

      if (!order_city || !order_country || !customer_city || !customer_country) {
        return res.status(400).json({ error: "Origin and destination cities are required" });
      }

      // Call AI model for prediction
      const fetch = (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

      let aiRecommendation = null;
      try {
        const aiResponse = await fetch("http://127.0.0.1:8000/infer_live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_city,
            order_country,
            customer_city,
            customer_country,
            sales_per_customer: sales_per_customer || 500,
          }),
        });

        const aiData = await aiResponse.json();
        const bestMode = aiData.per_mode_analysis.find(
          (m) => m.mode === aiData.best_mode_by_score
        );

        aiRecommendation = {
          mode: aiData.best_mode_by_score,
          score: aiData.best_score,
          delay: bestMode?.pred_delay || 0,
          profit: bestMode?.pred_profit || 0,
          co2: bestMode?.pred_co2 || 0,
          actorPolicyChoice: aiData.actor_policy_choice,
          allModes: aiData.per_mode_analysis,
          liveFeatures: aiData.live_features,
        };
      } catch (aiError) {
        console.error("AI prediction error:", aiError);
        // Continue without AI recommendation
      }

      // Create shipment
      const shipment = await shipmentModel.create({
        origin: `${order_city}, ${order_country}`,
        destination: `${customer_city}, ${customer_country}`,
        order_city,
        order_country,
        customer_city,
        customer_country,
        sales: sales_per_customer || 500,
        weight: aiRecommendation?.liveFeatures?.weight || 0,
        weatherScore: aiRecommendation?.liveFeatures?.ws || 0,
        fuelIndex: aiRecommendation?.liveFeatures?.fi || 0,
        distance: aiRecommendation?.liveFeatures?.km || 0,
        urgency: urgency || "normal",
        notes: notes || "",
        aiRecommendation,
        createdBy: req.user.id,
        status: "pending",
        approvedBy: null,
        approvedAt: null,
      });

      res.status(201).json({
        message: "Shipment created successfully",
        shipment,
      });
    } catch (error) {
      console.error("Create shipment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all shipments
  router.get("/all", authenticateToken, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 1000; // Increased default limit
      const skip = parseInt(req.query.skip) || 0;

      let shipments;
      if (req.user.role === "admin" || req.user.role === "manager") {
        shipments = await shipmentModel.getAll(limit, skip);
      } else {
        // Operators see their own shipments - use higher limit to get all
        shipments = await shipmentModel.findByUserId(req.user.id, limit, skip);
      }

      res.json({ 
        shipments,
        total: shipments.length,
        limit,
        skip
      });
    } catch (error) {
      console.error("Get shipments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single shipment
  router.get("/:id", authenticateToken, async (req, res) => {
    try {
      const shipment = await shipmentModel.findById(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }

      // Check permissions
      if (
        req.user.role !== "admin" &&
        req.user.role !== "manager" &&
        shipment.createdBy.toString() !== req.user.id
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json({ shipment });
    } catch (error) {
      console.error("Get shipment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Approve shipment (Manager only) - can override AI recommendation
  router.post("/:id/approve", authenticateToken, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { overrideMode, overrideReason } = req.body;
      const shipment = await shipmentModel.findById(req.params.id);
      
      if (!shipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }

      const updateData = {
        status: "approved",
        approvedBy: req.user.id,
        approvedAt: new Date(),
      };

      // If manager overrides AI recommendation
      if (overrideMode && overrideMode !== shipment.aiRecommendation?.mode) {
        // Find the mode data from allModes
        const overrideModeData = shipment.aiRecommendation?.allModes?.find(
          (m) => m.mode === overrideMode
        );
        
        if (overrideModeData) {
          updateData.managerOverride = {
            originalMode: shipment.aiRecommendation?.mode,
            overrideMode: overrideMode,
            overrideReason: overrideReason || "Manager override",
            overrideBy: req.user.id,
            overrideAt: new Date(),
            newProfit: overrideModeData.pred_profit,
            newCO2: overrideModeData.pred_co2,
            newDelay: overrideModeData.pred_delay,
          };
          // Update the final mode used
          updateData.finalMode = overrideMode;
        }
      } else {
        // Use AI recommendation
        updateData.finalMode = shipment.aiRecommendation?.mode;
      }

      const updatedShipment = await shipmentModel.update(req.params.id, updateData);

      res.json({
        message: "Shipment approved",
        shipment: updatedShipment,
      });
    } catch (error) {
      console.error("Approve shipment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add feedback
  router.post("/:id/feedback", authenticateToken, async (req, res) => {
    try {
      const { feedbackText, rating } = req.body;

      if (!feedbackText) {
        return res.status(400).json({ error: "Feedback text is required" });
      }

      await shipmentModel.addFeedback(req.params.id, {
        userId: req.user.id,
        userName: req.user.name,
        feedbackText,
        rating: rating || null,
      });

      res.json({ message: "Feedback added successfully" });
    } catch (error) {
      console.error("Add feedback error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get statistics
  router.get("/stats/overview", authenticateToken, requireRole("analyst", "manager", "admin"), async (req, res) => {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

      const stats = await shipmentModel.getStats(startDate, endDate);

      res.json({ stats, period: { startDate, endDate } });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = setupShipmentRoutes;

