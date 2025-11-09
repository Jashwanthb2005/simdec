import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { shipmentAPI } from "../../api/backendAPI";
import { motion } from "framer-motion";
import WeatherDashboard3D from "../Widgets/WeatherDashboard3D";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [shipmentsRes, statsRes] = await Promise.all([
        shipmentAPI.getAll().catch(() => ({ data: { shipments: [] } })),
        shipmentAPI.getStats().catch(() => ({ data: { stats: {} } })),
      ]);
      setShipments(shipmentsRes.data?.shipments || []);
      setStats(statsRes.data?.stats || {});
    } catch (error) {
      console.error("Error loading data:", error);
      setShipments([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, overrideMode = null, overrideReason = null) => {
    try {
      if (overrideMode) {
        await shipmentAPI.approve(id, { overrideMode, overrideReason });
        alert("Shipment approved with override!");
      } else {
        await shipmentAPI.approve(id);
        alert("Shipment approved successfully!");
      }
      loadData();
    } catch (error) {
      console.error("Error approving shipment:", error);
      alert("Failed to approve shipment: " + (error.response?.data?.error || error.message));
    }
  };

  const handleGenerateReport = async () => {
    try {
      const { reportsAPI } = await import("../../api/backendAPI");
      const response = await reportsAPI.generateWeekly();
      
      alert(
        `Weekly Report Generated and Sent!\n\n` +
        `- Emails sent: ${response.data.emailsSent}\n` +
        `- Total recipients: ${response.data.totalRecipients}\n` +
        `- Report period: ${response.data.reportData.period.start} to ${response.data.reportData.period.end}\n\n` +
        `Report includes:\n` +
        `- Total Shipments: ${response.data.reportData.totalShipments}\n` +
        `- Total Profit: ₹${Math.round(response.data.reportData.totalProfit)}\n` +
        `- Total CO₂: ${Math.round(response.data.reportData.totalCO2)} kg\n` +
        `- Pending: ${response.data.reportData.pendingShipments}\n` +
        `- Approved: ${response.data.reportData.approvedShipments}`
      );
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    }
  };

  // Extract unique cities from shipments for weather dashboard
  // NOTE: Must be called before any early returns to comply with Rules of Hooks
  const weatherCities = useMemo(() => {
    if (!shipments || shipments.length === 0) {
      return [];
    }
    const cityMap = new Map();
    shipments.forEach((s) => {
      if (s.order_city && s.latitude && s.longitude) {
        const key = `${s.order_city}-${s.latitude}-${s.longitude}`;
        if (!cityMap.has(key)) {
          cityMap.set(key, {
            name: s.order_city,
            lat: s.latitude,
            lng: s.longitude,
            country: s.order_country || "India",
          });
        }
      }
      if (s.customer_city && s.destCoords?.lat && s.destCoords?.lng) {
        const key = `${s.customer_city}-${s.destCoords.lat}-${s.destCoords.lng}`;
        if (!cityMap.has(key)) {
          cityMap.set(key, {
            name: s.customer_city,
            lat: s.destCoords.lat,
            lng: s.destCoords.lng,
            country: s.customer_country || "India",
          });
        }
      }
    });
    return Array.from(cityMap.values()).slice(0, 10);
  }, [shipments]);

  const pendingShipments = useMemo(() => {
    return shipments.filter((s) => s.status === "pending");
  }, [shipments]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-600 mt-2">Oversee operations and approve shipments</p>
          <p className="text-sm text-gray-500 mt-1">
            💡 <strong>Approval Authority:</strong> Managers and Admins can approve shipments. Click "View Details" to override AI recommendations.
          </p>
        </div>
        <button
          onClick={loadData}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* 3D Weather Dashboard - Show weather for cities in shipments */}
      {weatherCities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <WeatherDashboard3D cities={weatherCities} />
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Total Profit</div>
          <div className="text-3xl font-bold text-green-600">
            ₹{Math.round(stats.totalProfit || 0)}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Total CO₂</div>
          <div className="text-3xl font-bold text-red-600">
            {Math.round(stats.totalCO2 || 0)} kg
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Pending Approval</div>
          <div className="text-3xl font-bold text-yellow-600">{pendingShipments.length}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Avg Delay</div>
          <div className="text-3xl font-bold text-blue-600">
            {Math.round((stats.avgDelay || 0) * 10) / 10} days
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Pending Approvals</h2>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              {pendingShipments.length} pending
            </span>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Recommendation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CO₂</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pendingShipments.map((shipment) => (
                <tr key={shipment._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {shipment.origin || `${shipment.order_city || 'N/A'}, ${shipment.order_country || ''}`} → {shipment.destination || `${shipment.customer_city || 'N/A'}, ${shipment.customer_country || ''}`}
                    </div>
                    {shipment.createdAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        Created: {new Date(shipment.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold w-fit">
                        {shipment.aiRecommendation?.mode || "N/A"}
                      </span>
                      {shipment.aiRecommendation?.delay !== undefined && (
                        <div className="text-xs text-gray-500">
                          Delay: {Math.round((shipment.aiRecommendation.delay || 0) * 10) / 10} days
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-green-600">
                      ₹{Math.round(shipment.aiRecommendation?.profit || 0)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-red-600">
                      {Math.round(shipment.aiRecommendation?.co2 || 0)} kg
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleApprove(shipment._id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm hover:shadow-md"
                      >
                        ✓ Approve AI
                      </button>
                      <button
                        onClick={() => navigate(`/shipments/${shipment._id}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm hover:shadow-md"
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingShipments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No pending shipments to approve
            </div>
          )}
        </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/analytics")}
              className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              📈 View Analytics
            </button>
            <button
              onClick={() => navigate("/shipments")}
              className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              📦 All Shipments
            </button>
            <button
              onClick={handleGenerateReport}
              className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              📧 Generate Email Report
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

