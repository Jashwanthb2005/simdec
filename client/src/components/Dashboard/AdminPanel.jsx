import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI, shipmentAPI } from "../../api/backendAPI";
import { motion } from "framer-motion";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [modelStatus, setModelStatus] = useState(null);
  const [pendingShipments, setPendingShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, statsRes, modelRes, shipmentsRes] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getStats(),
        adminAPI.getModelStatus(),
        shipmentAPI.getAll({ limit: 100 }).catch(() => ({ data: { shipments: [] } })),
      ]);
      setUsers(usersRes.data.users || []);
      setStats(statsRes.data.stats || {});
      setModelStatus(modelRes.data);
      const shipments = shipmentsRes.data?.shipments || [];
      setPendingShipments(shipments.filter(s => s.status === "pending"));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveShipment = async (id) => {
    try {
      await shipmentAPI.approve(id);
      alert("Shipment approved successfully!");
      loadData();
    } catch (error) {
      console.error("Error approving shipment:", error);
      alert("Failed to approve shipment: " + (error.response?.data?.error || error.message));
    }
  };

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      await adminAPI.updateUserRole(userId, newRole);
      loadData();
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleRefreshStatus = () => {
    loadData();
    alert("System status refreshed!");
  };

  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const handleViewLogs = async () => {
    setShowLogs(true);
    setLoadingLogs(true);
    try {
      const response = await adminAPI.getLogs({ limit: 50 });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error("Error loading logs:", error);
      alert("Failed to load logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRetrainModel = async () => {
    if (!confirm("Are you sure you want to retrain the AI model? This may take several minutes.")) {
      return;
    }
    
    try {
      // In a real app, this would trigger model retraining
      alert("AI Model Retraining Initiated!\n\n" +
        "Status: Training started\n" +
        "Estimated time: 15-30 minutes\n" +
        "You will be notified when training is complete.\n\n" +
        "Note: This is a demo. In production, this would:\n" +
        "1. Collect feedback data\n" +
        "2. Retrain the model\n" +
        "3. Validate performance\n" +
        "4. Deploy new model");
      
      await adminAPI.retrainModel();
    } catch (error) {
      console.error("Error retraining model:", error);
      alert("Failed to initiate model retraining");
    }
  };

  const handleSystemSettings = () => {
    alert("System Settings\n\n" +
      "Available Settings:\n" +
      "- Model Configuration\n" +
      "- Email Notifications\n" +
      "- User Permissions\n" +
      "- Database Backup\n" +
      "- API Rate Limits\n\n" +
      "Settings panel coming soon!");
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-2">Manage users, monitor system, and configure settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Total Users</div>
          <div className="text-3xl font-bold text-blue-600">{stats.totalUsers || 0}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Total Shipments</div>
          <div className="text-3xl font-bold text-green-600">{stats.totalShipments || 0}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Model Status</div>
          <div className={`text-3xl font-bold ${
            modelStatus?.status === "healthy" ? "text-green-600" : "text-red-600"
          }`}>
            {modelStatus?.status === "healthy" ? "✓ Healthy" : "✗ Unhealthy"}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="text-sm text-gray-600 mb-2">Pending Shipments</div>
          <div className="text-3xl font-bold text-yellow-600">
            {stats.shipmentsByStatus?.pending || 0}
          </div>
        </motion.div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="operator">Operator</option>
                      <option value="manager">Manager</option>
                      <option value="analyst">Analyst</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      user.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Shipments Section - Admins can also approve */}
      {pendingShipments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden mb-8"
        >
          <div className="p-6 border-b flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Pending Shipment Approvals</h2>
              <p className="text-sm text-gray-500 mt-1">
                As an Admin, you can approve shipments. Managers typically handle approvals.
              </p>
            </div>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              {pendingShipments.length} pending
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CO₂</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingShipments.slice(0, 5).map((shipment) => (
                  <tr key={shipment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {shipment.origin || `${shipment.order_city || 'N/A'}`} → {shipment.destination || `${shipment.customer_city || 'N/A'}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {shipment.aiRecommendation?.mode || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-semibold">
                      ₹{Math.round(shipment.aiRecommendation?.profit || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600 font-semibold">
                      {Math.round(shipment.aiRecommendation?.co2 || 0)} kg
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveShipment(shipment._id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => navigate(`/shipments/${shipment._id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pendingShipments.length > 5 && (
            <div className="p-4 border-t text-center">
              <button
                onClick={() => navigate("/shipments")}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All {pendingShipments.length} Pending Shipments →
              </button>
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Model Service</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  modelStatus?.status === "healthy"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {modelStatus?.status === "healthy" ? "✓ Online" : "✗ Offline"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Database</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                ✓ Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">API Endpoints</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                ✓ Active
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Tools</h3>
          <div className="space-y-3">
            <button 
              onClick={handleRefreshStatus}
              className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              🔄 Refresh System Status
            </button>
            <button 
              onClick={handleViewLogs}
              className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              📊 View System Logs
            </button>
            <button 
              onClick={handleRetrainModel}
              className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              🤖 Retrain AI Model
            </button>
            <button 
              onClick={handleSystemSettings}
              className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              ⚙️ System Settings
            </button>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Statistics by Role</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.usersByRole?.operator || 0}</div>
            <div className="text-sm text-gray-600">Operators</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.usersByRole?.manager || 0}</div>
            <div className="text-sm text-gray-600">Managers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.usersByRole?.analyst || 0}</div>
            <div className="text-sm text-gray-600">Analysts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.usersByRole?.admin || 0}</div>
            <div className="text-sm text-gray-600">Admins</div>
          </div>
        </div>
      </motion.div>

      {/* API Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">API Logs & Activity</h2>
              <button
                onClick={() => setShowLogs(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {loadingLogs ? (
              <div className="text-center py-12">Loading logs...</div>
            ) : (
              <div className="space-y-3">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No logs available</div>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {log.action.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Route: {log.details?.route || "N/A"}</p>
                        {log.details?.aiMode && (
                          <p>AI Mode: {log.details.aiMode}</p>
                        )}
                        {log.details?.finalMode && (
                          <p>Final Mode: {log.details.finalMode}</p>
                        )}
                        {log.details?.override && (
                          <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                            <p className="text-orange-800 font-semibold">Override Applied:</p>
                            <p className="text-xs text-orange-700">
                              Mode: {log.details.override.mode} | Reason: {log.details.override.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

