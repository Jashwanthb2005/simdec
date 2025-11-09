// Notification model helper functions
const { ObjectId } = require("mongodb");

class Notification {
  constructor(db) {
    this.collection = db.collection("notifications");
  }

  async create(notificationData) {
    const notification = {
      ...notificationData,
      read: false,
      createdAt: new Date(),
    };
    const result = await this.collection.insertOne(notification);
    return { ...notification, _id: result.insertedId };
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByUserId(userId, limit = 50, skip = 0) {
    return await this.collection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }

  async findByRole(role, limit = 50, skip = 0) {
    return await this.collection
      .find({ recipients: role })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }

  async markAsRead(id, userId) {
    await this.collection.updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(userId) },
      { $set: { read: true, readAt: new Date() } }
    );
    return await this.findById(id);
  }

  async markAllAsRead(userId) {
    await this.collection.updateMany(
      { userId: new ObjectId(userId), read: false },
      { $set: { read: true, readAt: new Date() } }
    );
  }

  async getUnreadCount(userId) {
    return await this.collection.countDocuments({
      userId: new ObjectId(userId),
      read: false,
    });
  }

  async delete(id) {
    await this.collection.deleteOne({ _id: new ObjectId(id) });
  }
}

module.exports = Notification;


