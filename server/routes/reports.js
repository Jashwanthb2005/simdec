const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");
const emailService = require("../services/emailService");

function setupReportRoutes(db) {
  const Shipment = require("../models/Shipment");
  const User = require("../models/User");
  const shipmentModel = new Shipment(db);
  const userModel = new User(db);

  // Generate and send weekly report
  router.post("/weekly", authenticateToken, requireRole("manager", "admin"), async (req, res) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days
      const endDate = new Date();

      const stats = await shipmentModel.getStats(startDate, endDate);
      const shipments = await shipmentModel.getAll(1000, 0);

      const reportData = {
        totalShipments: stats.totalShipments || 0,
        totalProfit: stats.totalProfit || 0,
        totalCO2: stats.totalCO2 || 0,
        avgDelay: stats.avgDelay || 0,
        pendingShipments: shipments.filter((s) => s.status === "pending").length,
        approvedShipments: shipments.filter((s) => s.status === "approved").length,
        period: {
          start: startDate.toLocaleDateString(),
          end: endDate.toLocaleDateString(),
        },
      };

      // Send to all managers and analysts
      const recipients = await userModel.collection
        .find({
          role: { $in: ["manager", "analyst", "admin"] },
          "preferences.emailNotify": true,
        })
        .toArray();

      const emailResults = [];
      for (const recipient of recipients) {
        const result = await emailService.sendWeeklyReport(recipient.email, reportData);
        emailResults.push({ email: recipient.email, success: result.success });
      }

      res.json({
        message: "Weekly report generated and sent",
        reportData,
        emailsSent: emailResults.filter((r) => r.success).length,
        totalRecipients: recipients.length,
      });
    } catch (error) {
      console.error("Generate weekly report error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get report data (without sending email)
  router.get("/data", authenticateToken, requireRole("manager", "analyst", "admin"), async (req, res) => {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

      const stats = await shipmentModel.getStats(startDate, endDate);
      const shipments = await shipmentModel.getAll(1000, 0);

      const reportData = {
        totalShipments: stats.totalShipments || 0,
        totalProfit: stats.totalProfit || 0,
        totalCO2: stats.totalCO2 || 0,
        avgDelay: stats.avgDelay || 0,
        pendingShipments: shipments.filter((s) => s.status === "pending").length,
        approvedShipments: shipments.filter((s) => s.status === "approved").length,
        period: {
          start: startDate.toLocaleDateString(),
          end: endDate.toLocaleDateString(),
        },
      };

      res.json({ reportData });
    } catch (error) {
      console.error("Get report data error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = setupReportRoutes;

