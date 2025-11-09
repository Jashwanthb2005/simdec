// Enhanced Feedback model for learning loop
const { ObjectId } = require("mongodb");

class Feedback {
  constructor(db) {
    this.collection = db.collection("feedback");
  }

  async create(feedbackData) {
    const feedback = {
      ...feedbackData,
      createdAt: new Date(),
      processed: false, // For ML training pipeline
    };
    const result = await this.collection.insertOne(feedback);
    return { ...feedback, _id: result.insertedId };
  }

  async findByShipmentId(shipmentId) {
    return await this.collection
      .find({ shipmentId: new ObjectId(shipmentId) })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getUnprocessedFeedback(limit = 100) {
    return await this.collection
      .find({ processed: false })
      .limit(limit)
      .toArray();
  }

  async markAsProcessed(id) {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { processed: true, processedAt: new Date() } }
    );
  }

  async getFeedbackStats() {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          positiveFeedback: {
            $sum: { $cond: [{ $gte: ["$rating", 4] }, 1, 0] },
          },
          negativeFeedback: {
            $sum: { $cond: [{ $lt: ["$rating", 3] }, 1, 0] },
          },
        },
      },
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    return result[0] || {
      totalFeedback: 0,
      averageRating: 0,
      positiveFeedback: 0,
      negativeFeedback: 0,
    };
  }

  async getFeedbackForRetraining() {
    // Get feedback that can be used for model retraining
    return await this.collection
      .find({
        processed: false,
        rating: { $exists: true },
        feedbackText: { $exists: true, $ne: "" },
      })
      .toArray();
  }
}

module.exports = Feedback;

