import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { shipmentAPI } from "../../api/backendAPI";
import { motion } from "framer-motion";

export default function OperatorDashboard() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadShipments();
    // Refresh shipments every 30 seconds to show updates
    const interval = setInterval(loadShipments, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadShipments = async () => {
    try {
      // Request with higher limit to get all shipments
      const response = await shipmentAPI.getAll({ limit: 1000 }).catch(() => ({ data: { shipments: [] } }));
      setShipments(response.data?.shipments || []);
    } catch (error) {
      console.error("Error loading shipments:", error);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your shipments...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operator Dashboard</h1>
          <p className="text-gray-600 mt-2">Input shipment data and receive AI recommendations</p>
        </div>
        <button
          onClick={() => navigate("/shipments/create")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          + New Shipment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Total Shipments</div>
          <div className="text-3xl font-bold text-blue-600">{shipments.length}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Pending Approval</div>
          <div className="text-3xl font-bold text-yellow-600">
            {shipments.filter((s) => s.status === "pending").length}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Approved</div>
          <div className="text-3xl font-bold text-green-600">
            {shipments.filter((s) => s.status === "approved").length}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/shipments/create")}
              className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              📦 Create New Shipment
            </button>
            <button
              onClick={() => navigate("/shipments")}
              className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              📋 View All Shipments
            </button>
            <button
              onClick={() => navigate("/inference")}
              className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              🧠 Try AI Inference Demo
            </button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Shipments Created</span>
                <span className="font-semibold">{shipments.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((shipments.length / 10) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Goal: 10 shipments</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Approval Rate</span>
                <span className="font-semibold">
                  {shipments.length > 0
                    ? Math.round((shipments.filter((s) => s.status === "approved").length / shipments.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      shipments.length > 0
                        ? Math.min((shipments.filter((s) => s.status === "approved").length / shipments.length) * 100, 100)
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {shipments.filter((s) => s.status === "approved").length} of {shipments.length} approved
              </p>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Profit from Approved</span>
                <span className="font-semibold text-green-600">
                  ₹{Math.round(
                    shipments
                      .filter((s) => s.status === "approved")
                      .reduce((sum, s) => sum + (s.aiRecommendation?.profit || 0), 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {shipments.length > 0 && (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Recent Shipments</h2>
            <p className="text-sm text-gray-500 mt-1">Showing {Math.min(shipments.length, 10)} of {shipments.length} total shipments</p>
          </div>
          {shipments.length > 10 && (
            <button
              onClick={() => navigate("/shipments")}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All ({shipments.length}) →
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Recommendation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-4xl mb-4">📦</div>
                      <p className="text-gray-600 text-lg mb-2">No shipments yet</p>
                      <p className="text-gray-500 text-sm mb-4">Create your first shipment to get started!</p>
                      <button
                        onClick={() => navigate("/shipments/create")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
                      >
                        Create Your First Shipment
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                shipments.slice(0, 10).map((shipment, index) => (
                  <tr key={shipment._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {shipment.origin || shipment.order_city} → {shipment.destination || shipment.customer_city}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                          {shipment.aiRecommendation?.mode || shipment.finalMode || "N/A"}
                        </span>
                        {shipment.aiRecommendation && (
                          <span className="text-xs text-gray-500">
                            Profit: ₹{Math.round(shipment.aiRecommendation.profit || 0)} | 
                            CO₂: {Math.round(shipment.aiRecommendation.co2 || 0)}kg
                          </span>
                        )}
                        {shipment.managerOverride && (
                          <span className="text-xs text-orange-600 font-medium">
                            ⚠️ Overridden by Manager
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          shipment.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : shipment.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {shipment.status || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/shipments/${shipment._id}`)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

