const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { ObjectId } = require("mongodb");

function setupNotificationRoutes(db) {
  const Notification = require("../models/Notification");
  const notificationModel = new Notification(db);

  // Get user notifications
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const skip = parseInt(req.query.skip) || 0;
      const unreadOnly = req.query.unreadOnly === "true";

      let notifications;
      if (unreadOnly) {
        notifications = await notificationModel.collection
          .find({ userId: new ObjectId(req.user.id), read: false })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .toArray();
      } else {
        notifications = await notificationModel.findByUserId(req.user.id, limit, skip);
      }

      res.json({ notifications });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get unread count
  router.get("/unread/count", authenticateToken, async (req, res) => {
    try {
      // Also check role-based notifications
      const userNotifications = await notificationModel.getUnreadCount(req.user.id);
      const roleNotifications = await notificationModel.collection.countDocuments({
        recipients: req.user.role,
        read: false,
        userId: { $ne: new ObjectId(req.user.id) }, // Exclude user's own notifications
      });
      
      res.json({ count: userNotifications + roleNotifications });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mark notification as read
  router.put("/:id/read", authenticateToken, async (req, res) => {
    try {
      await notificationModel.markAsRead(req.params.id, req.user.id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mark all as read
  router.put("/read/all", authenticateToken, async (req, res) => {
    try {
      await notificationModel.markAllAsRead(req.user.id);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete notification
  router.delete("/:id", authenticateToken, async (req, res) => {
    try {
      await notificationModel.delete(req.params.id);
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = setupNotificationRoutes;

