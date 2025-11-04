const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { generateToken, authenticateToken } = require("../middleware/auth");

function setupAuthRoutes(db) {
  // Register
  router.post("/register", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Database not available. Please check MongoDB connection." });
      }

      const User = require("../models/User");
      const userModel = new User(db);

      const { name, email, password, role, companyId } = req.body;

      // Validate input
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      // Check if user exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await userModel.create({
        name,
        email,
        passwordHash,
        role: role || "operator",
        companyId: companyId || null,
        preferences: {
          emailNotify: true,
          pushNotify: true,
        },
      });

      // Generate token
      const token = generateToken(user);

      res.status(201).json({
        message: "User created successfully",
        user: {
          _id: user._id.toString(),
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error: " + error.message });
    }
  });

  // Login
  router.post("/login", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Database not available. Please check MongoDB connection." });
      }

      const User = require("../models/User");
      const userModel = new User(db);

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Find user
      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Update last login
      await userModel.updateLastLogin(user._id);

      // Generate token
      const token = generateToken(user);

      res.json({
        message: "Login successful",
        user: {
          _id: user._id.toString(),
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          preferences: user.preferences,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error: " + error.message });
    }
  });

  // Get current user
  router.get("/me", authenticateToken, async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Database not available. Please check MongoDB connection." });
      }

      const User = require("../models/User");
      const userModel = new User(db);

      const user = await userModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        user: {
          _id: user._id.toString(),
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          preferences: user.preferences,
          lastLogin: user.lastLogin,
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Internal server error: " + error.message });
    }
  });

  return router;
}

module.exports = setupAuthRoutes;

