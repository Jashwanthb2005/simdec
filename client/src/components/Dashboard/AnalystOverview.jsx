import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { shipmentAPI } from "../../api/backendAPI";
import { motion } from "framer-motion";

export default function AnalystOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [recentShipments, setRecentShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [shipmentsRes, statsRes] = await Promise.all([
        shipmentAPI.getAll({ limit: 5 }).catch(() => ({ data: { shipments: [] } })),
        shipmentAPI.getStats().catch(() => ({ data: { stats: {} } })),
      ]);

      const shipmentsData = shipmentsRes.data?.shipments || [];
      const statsData = statsRes.data?.stats || {};

      setRecentShipments(shipmentsData);
      setStats({
        totalShipments: statsData.totalShipments || 0,
        totalCO2: statsData.totalCO2 || 0,
        totalProfit: statsData.totalProfit || 0,
        avgDelay: statsData.avgDelay || 0,
      });
    } catch (error) {
      console.error("Error loading overview data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading overview...</p>
      </div>
    );
  }

  const esgScore = stats.totalShipments > 0 && stats.totalCO2 > 0
    ? Math.max(0, 100 - Math.round((stats.totalCO2 / stats.totalShipments) / 10))
    : 85;

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analyst Dashboard</h1>
          <p className="text-gray-600 mt-2">Quick overview of sustainability metrics and recent activity</p>
        </div>
        <button
          onClick={() => navigate("/analytics")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
        >
          View Full Analytics →
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Total CO₂ Emissions</div>
          <div className="text-3xl font-bold text-red-600">
            {Math.round(stats.totalCO2 || 0)} kg
          </div>
          <div className="text-xs text-gray-500 mt-2">Last 30 days</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Total Profit</div>
          <div className="text-3xl font-bold text-green-600">
            ₹{Math.round(stats.totalProfit || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-2">Last 30 days</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Shipments Analyzed</div>
          <div className="text-3xl font-bold text-blue-600">
            {stats.totalShipments || 0}
          </div>
          <div className="text-xs text-gray-500 mt-2">Last 30 days</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">ESG Score</div>
          <div className="text-3xl font-bold text-purple-600">
            {esgScore}/100
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {esgScore >= 80 ? "Excellent" : esgScore >= 60 ? "Good" : "Needs Improvement"}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/analytics")}
              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              📊 View Full Analytics Dashboard
            </button>
            <button
              onClick={() => navigate("/shipments")}
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-gray-300 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              📦 View All Shipments
            </button>
            <button
              onClick={async () => {
                try {
                  const csv = [
                    ["Date", "Mode", "Profit (₹)", "CO₂ (kg)", "Delay (days)"],
                    ...recentShipments.map(s => [
                      new Date(s.createdAt).toLocaleDateString(),
                      s.aiRecommendation?.mode || "N/A",
                      Math.round(s.aiRecommendation?.profit || 0),
                      Math.round(s.aiRecommendation?.co2 || 0),
                      Math.round((s.aiRecommendation?.delay || 0) * 10) / 10,
                    ])
                  ].map(row => row.join(",")).join("\n");
                  
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `shipments-export-${new Date().toISOString().split("T")[0]}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error("Error exporting data:", error);
                }
              }}
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-gray-300 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              📥 Export Recent Data (CSV)
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ESG Metrics Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Carbon Footprint Score</span>
              <span className="text-xl font-bold text-green-600">{esgScore}/100</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sustainability Rating</span>
              <span className="text-xl font-bold text-green-600">
                {esgScore >= 80 ? "A+" : esgScore >= 60 ? "A" : "B"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg CO₂ per Shipment</span>
              <span className="text-lg font-semibold text-gray-900">
                {stats.totalShipments > 0
                  ? Math.round((stats.totalCO2 || 0) / stats.totalShipments)
                  : 0} kg
              </span>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                💡 ESG Score calculated based on CO₂ emissions per shipment. Lower emissions = Higher score.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Shipments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Recent Shipments</h2>
            <p className="text-sm text-gray-500 mt-1">Latest 5 shipments for quick reference</p>
          </div>
          <button
            onClick={() => navigate("/shipments")}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View All →
          </button>
        </div>
        <div className="overflow-x-auto">
          {recentShipments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-4">📦</div>
              <p className="text-gray-600 text-lg mb-2">No shipments yet</p>
              <p className="text-gray-500 text-sm">Shipments will appear here once they're created</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CO₂</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentShipments.map((shipment, index) => (
                  <tr key={shipment._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {shipment.origin || `${shipment.order_city || 'N/A'}, ${shipment.order_country || ''}`} → {shipment.destination || `${shipment.customer_city || 'N/A'}, ${shipment.customer_country || ''}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {shipment.aiRecommendation?.mode || shipment.finalMode || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {Math.round(shipment.aiRecommendation?.co2 || 0)} kg
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      ₹{Math.round(shipment.aiRecommendation?.profit || 0)}
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}

