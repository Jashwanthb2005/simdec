// Simple scheduler for weekly reports
// In production, use node-cron or a proper job queue like Bull

function setupScheduler(db) {
  // Schedule weekly reports (every Monday at 9 AM)
  const scheduleWeeklyReports = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = now.getHours();

    // Check if it's Monday (1) and 9 AM
    if (dayOfWeek === 1 && hour === 9) {
      sendWeeklyReports(db);
    }
  };

  // Run check every hour
  setInterval(scheduleWeeklyReports, 60 * 60 * 1000);

  console.log("✅ Scheduler initialized (weekly reports)");
}

async function sendWeeklyReports(db) {
  try {
    const Shipment = require("../models/Shipment");
    const User = require("../models/User");
    const emailService = require("./emailService");
    
    const shipmentModel = new Shipment(db);
    const userModel = new User(db);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
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

    const recipients = await userModel.collection
      .find({
        role: { $in: ["manager", "analyst", "admin"] },
        "preferences.emailNotify": true,
      })
      .toArray();

    for (const recipient of recipients) {
      await emailService.sendWeeklyReport(recipient.email, reportData);
    }

    console.log(`✅ Weekly reports sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error("Error sending weekly reports:", error);
  }
}

module.exports = { setupScheduler };

