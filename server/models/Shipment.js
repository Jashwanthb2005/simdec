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
    // Handle both string and ObjectId formats for backward compatibility
    // MongoDB can store ObjectId references as either ObjectId or string
    const userIdString = userId instanceof ObjectId ? userId.toString() : String(userId);
    
    console.log("findByUserId - querying for userId:", userId, "as string:", userIdString);
    
    let query;
    
    // If it's a valid ObjectId string, query with both ObjectId and string formats
    if (ObjectId.isValid(userIdString)) {
      const objectIdValue = new ObjectId(userIdString);
      // Query for both ObjectId and string formats using $or
      query = {
        $or: [
          { createdBy: objectIdValue },
          { createdBy: userIdString }
        ]
      };
      console.log("Using $or query for ObjectId and string formats");
    } else {
      // Not a valid ObjectId, just query as string
      query = { createdBy: userIdString };
      console.log("Using string-only query");
    }
    
    const results = await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
    
    console.log(`findByUserId - found ${results.length} shipments for user ${userIdString}`);
    
    // Debug logging
    if (results.length > 0) {
      const first = results[0];
      console.log("First shipment - createdBy:", first.createdBy, 
        "type:", typeof first.createdBy,
        "is ObjectId:", first.createdBy instanceof ObjectId);
    } else {
      // Check what format is stored in the database
      const sample = await this.collection.findOne({});
      if (sample && sample.createdBy) {
        console.log("DEBUG: Sample shipment in DB - createdBy:", sample.createdBy,
          "type:", typeof sample.createdBy,
          "is ObjectId:", sample.createdBy instanceof ObjectId,
          "toString:", sample.createdBy.toString());
        console.log("DEBUG: Query userIdString:", userIdString);
        console.log("DEBUG: Query objectIdValue:", ObjectId.isValid(userIdString) ? new ObjectId(userIdString).toString() : "N/A");
      } else {
        console.log("DEBUG: No shipments found in database at all");
      }
    }
    
    return results;
  }

  async getAll(limit = 100, skip = 0) {
    const results = await this.collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
    
    console.log(`Shipment.getAll: Found ${results.length} shipments (limit: ${limit}, skip: ${skip})`);
    if (results.length > 0) {
      console.log(`  First shipment: ${results[0]._id}, createdAt: ${results[0].createdAt}, status: ${results[0].status}`);
    } else {
      // Check total count
      const totalCount = await this.collection.countDocuments({});
      console.log(`  No shipments returned, but total count in DB: ${totalCount}`);
    }
    
    return results;
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

  async getStats(startDate, endDate, companyId = null) {
    const matchStage = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Add company filter if provided (multi-tenant support)
    if (companyId) {
      matchStage.companyId = companyId;
    }

    const pipeline = [
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          totalProfit: { 
            $sum: { 
              $ifNull: ["$aiRecommendation.profit", 0] 
            } 
          },
          totalCO2: { 
            $sum: { 
              $ifNull: ["$aiRecommendation.co2", 0] 
            } 
          },
          avgDelay: { 
            $avg: { 
              $ifNull: ["$aiRecommendation.delay", 0] 
            } 
          },
        },
      },
    ];
    const result = await this.collection.aggregate(pipeline).toArray();
    const stats = result[0] || {};
    
    // Ensure all fields have default values
    return {
      totalShipments: stats.totalShipments || 0,
      totalProfit: stats.totalProfit || 0,
      totalCO2: stats.totalCO2 || 0,
      avgDelay: stats.avgDelay || 0,
    };
  }

  async findByCompanyId(companyId, limit = 100, skip = 0) {
    return await this.collection
      .find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }
}

module.exports = Shipment;

