import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { shipmentAPI } from "../../api/backendAPI";
import { motion } from "framer-motion";

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

  const handleApprove = async (id) => {
    try {
      await shipmentAPI.approve(id);
      loadData();
    } catch (error) {
      console.error("Error approving shipment:", error);
    }
  };

  const handleGenerateReport = async () => {
    try {
      const pendingCount = shipments.filter((s) => s.status === "pending").length;
      const reportData = {
        period: "Last 30 days",
        totalProfit: Math.round(stats.totalProfit || 0),
        totalCO2: Math.round(stats.totalCO2 || 0),
        pendingShipments: pendingCount,
        approvedShipments: shipments.filter((s) => s.status === "approved").length,
        avgDelay: Math.round((stats.avgDelay || 0) * 10) / 10,
      };
      
      // In a real app, this would send an email. For now, we'll show a preview
      const reportText = `
Manager Operations Report
Period: ${reportData.period}

Key Metrics:
- Total Profit: ₹${reportData.totalProfit}
- Total CO₂ Emissions: ${reportData.totalCO2} kg
- Pending Approvals: ${reportData.pendingShipments}
- Approved Shipments: ${reportData.approvedShipments}
- Average Delay: ${reportData.avgDelay} days

Generated: ${new Date().toLocaleString()}
      `;
      
      alert("Email Report Generated!\n\n" + reportText);
      
      // TODO: Implement actual email sending via backend
      // await managerAPI.sendEmailReport(reportData);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report");
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const pendingShipments = shipments.filter((s) => s.status === "pending");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-600 mt-2">Oversee operations and approve shipments</p>
      </div>

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
                      {shipment.origin} → {shipment.destination}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {shipment.aiRecommendation?.mode || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    ₹{Math.round(shipment.aiRecommendation?.profit || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {Math.round(shipment.aiRecommendation?.co2 || 0)} kg
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleApprove(shipment._id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Approve
                    </button>
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

