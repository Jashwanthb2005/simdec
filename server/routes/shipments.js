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
        
        // Use actor's learned policy choice as the primary recommendation
        // This is the model's learned decision, not just the highest score
        const recommendedMode = aiData.actor_policy_choice || aiData.best_mode_by_score;
        
        // Find the mode data for the recommended mode
        const recommendedModeData = aiData.per_mode_analysis.find(
          (m) => m.mode === recommendedMode
        ) || aiData.per_mode_analysis.find(
          (m) => m.mode === aiData.best_mode_by_score
        );

        aiRecommendation = {
          mode: recommendedMode, // Use actor's policy choice as primary recommendation
          score: recommendedModeData?.score || aiData.best_score,
          delay: recommendedModeData?.pred_delay || 0,
          profit: recommendedModeData?.pred_profit || 0,
          co2: recommendedModeData?.pred_co2 || 0,
          actorPolicyChoice: aiData.actor_policy_choice, // Actor's learned choice
          bestModeByScore: aiData.best_mode_by_score, // Simulator's optimal (for reference)
          bestScore: aiData.best_score, // Best score for comparison
          allModes: aiData.per_mode_analysis,
          liveFeatures: aiData.live_features,
        };
      } catch (aiError) {
        console.error("AI prediction error:", aiError);
        // Continue without AI recommendation
      }

      // Fetch and store weather data for both origin and destination cities
      let weatherData = null;
      let originCoords = null;
      let destCoords = null;
      
      try {
        const weatherService = require("../services/weatherService");
        
        console.log(`\n🌤️ === Starting weather fetch for shipment ===`);
        console.log(`Origin: ${order_city}, ${order_country}`);
        console.log(`Destination: ${customer_city}, ${customer_country}\n`);
        
        // Fetch weather for origin city (geocodes and fetches weather)
        const originWeather = await weatherService.fetchWeatherForCity(order_city, order_country);
        
        // Add delay between requests to respect rate limits
        console.log(`⏳ Waiting 2 seconds before fetching destination weather...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch weather for destination city
        const destWeather = await weatherService.fetchWeatherForCity(customer_city, customer_country);

        console.log(`\n📊 Weather fetch results:`);
        console.log(`  Origin: ${originWeather ? "✅ SUCCESS" : "❌ FAILED"}`);
        console.log(`  Destination: ${destWeather ? "✅ SUCCESS" : "❌ FAILED"}\n`);

        // Store coordinates if we have them
        if (originWeather?.coordinates) {
          originCoords = {
            lat: originWeather.coordinates.lat,
            lng: originWeather.coordinates.lng,
          };
          console.log(`📍 Origin coordinates: ${originCoords.lat}, ${originCoords.lng}`);
        }
        if (destWeather?.coordinates) {
          destCoords = {
            lat: destWeather.coordinates.lat,
            lng: destWeather.coordinates.lng,
          };
          console.log(`📍 Destination coordinates: ${destCoords.lat}, ${destCoords.lng}`);
        }

        // Store weather data (without coordinates as they're stored separately)
        // Ensure dates are properly formatted for MongoDB
        if (originWeather || destWeather) {
          weatherData = {
            origin: originWeather ? {
              temperature: originWeather.temperature || 0,
              humidity: originWeather.humidity || 0,
              windspeed: originWeather.windspeed || 0,
              weatherCode: originWeather.weatherCode || 0,
              fetchedAt: originWeather.fetchedAt || new Date(),
            } : null,
            destination: destWeather ? {
              temperature: destWeather.temperature || 0,
              humidity: destWeather.humidity || 0,
              windspeed: destWeather.windspeed || 0,
              weatherCode: destWeather.weatherCode || 0,
              fetchedAt: destWeather.fetchedAt || new Date(),
            } : null,
            fetchedAt: new Date(),
          };
          
          console.log(`✅ Weather data prepared for storage:`, JSON.stringify({
            origin: weatherData.origin ? {
              temp: weatherData.origin.temperature,
              humidity: weatherData.origin.humidity,
              windspeed: weatherData.origin.windspeed,
              code: weatherData.origin.weatherCode,
            } : null,
            destination: weatherData.destination ? {
              temp: weatherData.destination.temperature,
              humidity: weatherData.destination.humidity,
              windspeed: weatherData.destination.windspeed,
              code: weatherData.destination.weatherCode,
            } : null,
          }, null, 2));
        } else {
          console.warn(`⚠️ Could not fetch weather data for either city - shipment will be created without weather data`);
        }
      } catch (weatherError) {
        console.error(`❌ Weather fetching error:`, weatherError.message);
        console.error(weatherError.stack);
        // Continue without weather data - shipment creation should not fail
      }
      
      console.log(`\n📦 Weather data to be stored:`, weatherData ? "YES" : "NO");
      if (weatherData) {
        console.log(`   Origin: ${weatherData.origin ? "YES" : "NO"}`);
        console.log(`   Destination: ${weatherData.destination ? "YES" : "NO"}`);
      }

      // Get user's company ID for multi-tenant support
      const User = require("../models/User");
      const userModel = new User(db);
      const user = await userModel.findById(req.user.id);
      const companyId = user?.companyId || null;

      // Create shipment - ensure createdBy is ObjectId
      const { ObjectId } = require("mongodb");
      const createdBy = typeof req.user.id === 'string' ? new ObjectId(req.user.id) : req.user.id;
      
      console.log("\n📦 === Creating shipment ===");
      console.log("User:", req.user.id, "as ObjectId:", createdBy);
      console.log("Weather data:", weatherData ? "PRESENT" : "MISSING");
      console.log("Origin coords:", originCoords ? `${originCoords.lat}, ${originCoords.lng}` : "MISSING");
      console.log("Dest coords:", destCoords ? `${destCoords.lat}, ${destCoords.lng}` : "MISSING");
      
      const shipmentData = {
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
        weatherData, // Store weather data at shipment creation time
        originCoords, // Store origin coordinates
        destCoords, // Store destination coordinates
        latitude: originCoords?.lat || null, // For backward compatibility
        longitude: originCoords?.lng || null, // For backward compatibility
        createdBy: createdBy, // Store as ObjectId for consistent querying
        companyId, // Multi-tenant support
        status: "pending",
        approvedBy: null,
        approvedAt: null,
      };
      
      console.log("Shipment data keys:", Object.keys(shipmentData));
      console.log("Weather data in shipment:", shipmentData.weatherData ? "YES" : "NO");
      
      const shipment = await shipmentModel.create(shipmentData);
      
      console.log("✅ Shipment created with ID:", shipment._id);
      console.log("✅ Shipment createdBy:", shipment.createdBy);
      console.log("✅ Weather data in created shipment:", shipment.weatherData ? "YES" : "NO");
      if (shipment.weatherData) {
        console.log("   Origin weather:", shipment.weatherData.origin ? "YES" : "NO");
        console.log("   Destination weather:", shipment.weatherData.destination ? "YES" : "NO");
      }

      // Create notification for managers
      try {
        const Notification = require("../models/Notification");
        const User = require("../models/User");
        const notificationModel = new Notification(db);
        const userModel = new User(db);
        
        const managers = await userModel.getUsersByRole("manager");
        for (const manager of managers) {
          await notificationModel.create({
            userId: manager._id,
            type: "shipment_created",
            title: "New Shipment Requires Approval",
            message: `A new shipment from ${order_city} to ${customer_city} has been created and requires your approval.`,
            severity: "info",
            shipmentId: shipment._id,
            recipients: ["manager"],
          });
        }

        // Send email notification to managers
        const emailService = require("../services/emailService");
        for (const manager of managers) {
          if (manager.preferences?.emailNotify) {
            await emailService.sendShipmentNotification(manager.email, shipment);
          }
        }
      } catch (notifError) {
        console.warn("Notification creation failed:", notifError);
        // Don't fail the request if notifications fail
      }

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
      const { ObjectId } = require("mongodb");

      // Get user's company for multi-tenant filtering
      let companyId = null;
      try {
      const User = require("../models/User");
      const userModel = new User(db);
      const user = await userModel.findById(req.user.id);
        companyId = user?.companyId || null;
        console.log("Getting shipments for user:", req.user.id, "role:", req.user.role, "companyId:", companyId, "userFound:", !!user);
      } catch (userError) {
        console.warn("Error fetching user for shipments query:", userError);
        // Continue without company filtering if user lookup fails
        companyId = null;
      }

      let shipments;
      if (req.user.role === "admin" && !companyId) {
        // Super admin sees all shipments
        console.log("Super admin - getting all shipments");
        shipments = await shipmentModel.getAll(limit, skip);
      } else if (req.user.role === "admin" || req.user.role === "manager" || req.user.role === "analyst") {
        // Admin, Manager, and Analyst see all shipments (filtered by company if applicable)
        if (companyId) {
          console.log(`${req.user.role} with company - filtering by companyId:`, companyId);
          shipments = await shipmentModel.findByCompanyId(companyId, limit, skip);
          console.log(`Found ${shipments.length} shipments for ${req.user.role} with companyId: ${companyId}`);
        } else {
          console.log(`${req.user.role} without company - getting all shipments`);
          shipments = await shipmentModel.getAll(limit, skip);
          console.log(`Found ${shipments.length} total shipments for ${req.user.role}`);
          
          // Debug: Check if there are any shipments in the database at all
          const totalCount = await shipmentModel.collection.countDocuments({});
          console.log(`Total shipments in database: ${totalCount}`);
          
          if (shipments.length === 0 && totalCount > 0) {
            console.warn("⚠️ WARNING: Database has shipments but query returned empty!");
            // Try to get a sample shipment to see what's in the DB
            const sample = await shipmentModel.collection.findOne({});
            if (sample) {
              console.log("Sample shipment from DB:", {
                _id: sample._id,
                createdAt: sample.createdAt,
                status: sample.status,
                createdBy: sample.createdBy,
                companyId: sample.companyId,
              });
            }
          }
        }
      } else {
        // Operators see their own shipments only
        console.log("Operator - querying shipments for userId:", req.user.id, "type:", typeof req.user.id);
        // Pass the userId as-is (string from JWT) - findByUserId will handle both ObjectId and string formats
        shipments = await shipmentModel.findByUserId(req.user.id, limit, skip);
        console.log(`Found ${shipments.length} shipments for operator ${req.user.id}`);
      }

      console.log(`Returning ${shipments.length} shipments to client`);

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
      // Handle empty body or null body gracefully
      const body = req.body || {};
      const { overrideMode, overrideReason } = body;
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

      // Create notification for operator
      try {
        const Notification = require("../models/Notification");
        const User = require("../models/User");
        const notificationModel = new Notification(db);
        const userModel = new User(db);
        const emailService = require("../services/emailService");
        
        const operator = await userModel.findById(shipment.createdBy.toString());
        if (operator) {
          await notificationModel.create({
            userId: operator._id,
            type: "shipment_approved",
            title: "Shipment Approved",
            message: `Your shipment from ${shipment.origin} to ${shipment.destination} has been approved.`,
            severity: "success",
            shipmentId: shipment._id,
            recipients: ["operator"],
          });

          // Send email notification
          if (operator.preferences?.emailNotify) {
            await emailService.sendApprovalNotification(operator.email, updatedShipment);
          }
        }
      } catch (notifError) {
        console.warn("Notification creation failed:", notifError);
      }

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

      console.log("Getting stats for user:", req.user.id, "role:", req.user.role, "period:", { startDate, endDate });

      // Get user's company for multi-tenant filtering
      let companyId = null;
      try {
        const User = require("../models/User");
        const userModel = new User(db);
        const user = await userModel.findById(req.user.id);
        companyId = user?.companyId || null;
        console.log("Stats query - user found:", !!user, "companyId:", companyId);
      } catch (userError) {
        console.warn("Error fetching user for stats query:", userError);
        // Continue without company filtering if user lookup fails
        companyId = null;
      }

      const stats = await shipmentModel.getStats(startDate, endDate, companyId);

      console.log("Stats result:", JSON.stringify(stats, null, 2));

      res.json({ stats, period: { startDate, endDate } });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = setupShipmentRoutes;

