// Migration script to fix shipment createdBy fields
// This converts string user IDs to ObjectId format for consistency
// Run with: node server/scripts/fix-shipment-userids.js

const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

async function fixShipmentUserIds() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017";
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("simtodec");
    const shipmentsCollection = db.collection("shipments");

    // Find all shipments with string createdBy
    const shipments = await shipmentsCollection.find({}).toArray();
    console.log(`Found ${shipments.length} total shipments`);

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const shipment of shipments) {
      try {
        // Check if createdBy is a string (not ObjectId)
        if (shipment.createdBy && typeof shipment.createdBy === 'string' && ObjectId.isValid(shipment.createdBy)) {
          // Convert to ObjectId
          await shipmentsCollection.updateOne(
            { _id: shipment._id },
            { $set: { createdBy: new ObjectId(shipment.createdBy) } }
          );
          fixed++;
          console.log(`✅ Fixed shipment ${shipment._id} - converted createdBy from string to ObjectId`);
        } else if (shipment.createdBy instanceof ObjectId) {
          skipped++;
          console.log(`⏭️  Skipped shipment ${shipment._id} - already ObjectId`);
        } else {
          skipped++;
          console.log(`⏭️  Skipped shipment ${shipment._id} - invalid createdBy format`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error fixing shipment ${shipment._id}:`, error.message);
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${shipments.length}`);

  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    await client.close();
    console.log("✅ Connection closed");
  }
}

// Run migration
fixShipmentUserIds();

