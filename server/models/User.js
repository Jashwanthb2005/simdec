// User model helper functions
const { ObjectId } = require("mongodb");

class User {
  constructor(db) {
    this.collection = db.collection("users");
  }

  async create(userData) {
    const user = {
      ...userData,
      createdAt: new Date(),
      lastLogin: null,
      isActive: true,
    };
    const result = await this.collection.insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  async findByEmail(email) {
    return await this.collection.findOne({ email });
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async update(id, updates) {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );
    return await this.findById(id);
  }

  async updateLastLogin(id) {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { lastLogin: new Date() } }
    );
  }

  async getAllUsers() {
    return await this.collection.find({}).toArray();
  }

  async getUsersByRole(role) {
    return await this.collection.find({ role }).toArray();
  }
}

module.exports = User;

