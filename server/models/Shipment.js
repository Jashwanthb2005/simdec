// Shipment model helper functions
const { ObjectId } = require("mongodb");

class Shipment {
  constructor(db) {
    this.collection = db.collection("shipments");
  }

  async create(shipmentData) {
    const shipment = {
      ...shipmentData,
      status: shipmentData.status || "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.collection.insertOne(shipment);
    return { ...shipment, _id: result.insertedId };
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByUserId(userId, limit = 1000, skip = 0) {
    return await this.collection
      .find({ createdBy: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }

  async getAll(limit = 100, skip = 0) {
    return await this.collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }

  async update(id, updates) {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    );
    return await this.findById(id);
  }

  async addFeedback(shipmentId, feedback) {
    await this.collection.updateOne(
      { _id: new ObjectId(shipmentId) },
      {
        $push: {
          feedback: {
            ...feedback,
            createdAt: new Date(),
          },
        },
      }
    );
    return await this.findById(shipmentId);
  }

  async getStats(startDate, endDate) {
    const pipeline = [
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          totalProfit: { $sum: "$aiRecommendation.profit" },
          totalCO2: { $sum: "$aiRecommendation.co2" },
          avgDelay: { $avg: "$aiRecommendation.delay" },
        },
      },
    ];
    const result = await this.collection.aggregate(pipeline).toArray();
    return result[0] || {};
  }
}

module.exports = Shipment;

