import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { shipmentAPI } from "../../api/backendAPI";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import WeatherDashboard3D from "../Widgets/WeatherDashboard3D";

export default function OperatorDashboard() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const loadShipments = async (showLoading = true) => {
    try {
      setError(null);
      if (showLoading) {
        setLoading(true);
      }
      
      console.log("Loading shipments for operator:", user?.email, user?.id);
      // Request with higher limit to get all shipments for this operator
      const response = await shipmentAPI.getAll({ limit: 1000 });
      console.log("Shipments API response:", response.data);
      
      if (response.data && response.data.shipments) {
        // Sort by date (newest first)
        const sortedShipments = [...response.data.shipments].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        setShipments(sortedShipments);
        console.log(`✅ Loaded ${sortedShipments.length} shipments for operator ${user?.name}`);
        
        // Log shipment IDs for debugging
        if (sortedShipments.length > 0) {
          console.log("Shipment IDs:", sortedShipments.map(s => s._id));
          console.log("First shipment:", sortedShipments[0]);
        } else {
          console.warn("⚠️ No shipments found for this operator");
        }
      } else {
        setShipments([]);
        console.warn("⚠️ No shipments data in response:", response.data);
        if (response.data) {
          console.warn("Response structure:", Object.keys(response.data));
        }
      }
    } catch (error) {
      console.error("❌ Error loading shipments:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      setError(error.response?.data?.error || error.message || "Failed to load shipments");
      setShipments([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Check if we need to refresh (e.g., after creating a shipment)
  useEffect(() => {
    const shouldRefresh = location.state?.refresh;
    const newShipmentId = location.state?.newShipmentId;
    
    if (shouldRefresh) {
      setSuccessMessage(location.state.message || "Shipment created successfully!");
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
      
      // Wait a moment for the backend to finish processing, then refresh
      setTimeout(() => {
        console.log("Refreshing shipments after creation, new shipment ID:", newShipmentId);
        loadShipments(false); // Don't show loading spinner on refresh
      }, 1000); // Increased delay to ensure backend has processed
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      // Always load shipments on mount
      loadShipments(true);
    }
    
    // Refresh shipments every 30 seconds to show updates
    const interval = setInterval(() => {
      loadShipments(false); // Silent refresh
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.refresh, location.state?.newShipmentId]);

  // Also add a focus listener to refresh when user returns to the page
  useEffect(() => {
    const handleFocus = () => {
      // Refresh when window gets focus (user returns to tab)
      console.log("Window focused, refreshing shipments...");
      loadShipments(false); // Silent refresh
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extract unique cities from shipments for weather dashboard
  const weatherCities = useMemo(() => {
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

  if (loading && shipments.length === 0) {
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
          <p className="text-gray-600 mt-2">
            Input shipment data and receive AI recommendations
            {user && <span className="text-gray-400"> • Logged in as {user.name}</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              console.log("Manual refresh triggered");
              loadShipments(true);
            }}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-semibold transition disabled:opacity-50 flex items-center gap-2"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => navigate("/shipments/create")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            + New Shipment
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-semibold">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 font-semibold">Error loading shipments</p>
            </div>
            <button
              onClick={() => loadShipments(true)}
              className="text-red-600 hover:text-red-800 text-sm font-medium underline"
            >
              Retry
            </button>
          </div>
          <p className="text-red-600 text-sm mt-2">{error}</p>
        </div>
      )}

      {/* 3D Weather Dashboard - Show weather for cities in operator's shipments */}
      {weatherCities.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <WeatherDashboard3D cities={weatherCities} />
        </motion.div>
      ) : (
        // Show default cities if operator has no shipments yet
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <WeatherDashboard3D />
        </motion.div>
      )}

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

      {/* Shipments Table - Always show, even if empty */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your Shipments</h2>
            <p className="text-sm text-gray-500 mt-1">
              {shipments.length === 0 
                ? "No shipments yet" 
                : `Showing ${Math.min(shipments.length, 20)} of ${shipments.length} total shipments`}
            </p>
          </div>
          {shipments.length > 20 && (
            <button
              onClick={() => navigate("/shipments")}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All ({shipments.length}) →
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          {shipments.length === 0 ? (
            <div className="px-6 py-12 text-center">
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
            </div>
          ) : (
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
                {shipments.slice(0, 20).map((shipment, index) => (
                  <tr key={shipment._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {shipment.origin || `${shipment.order_city || 'N/A'}, ${shipment.order_country || ''}`} → {shipment.destination || `${shipment.customer_city || 'N/A'}, ${shipment.customer_country || ''}`}
                      </div>
                      {shipment.distance && (
                        <div className="text-xs text-gray-500 mt-1">
                          Distance: {Math.round(shipment.distance)} km
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold w-fit">
                          {shipment.aiRecommendation?.mode || shipment.finalMode || "N/A"}
                        </span>
                        {shipment.aiRecommendation && (
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <div>Profit: ₹{Math.round(shipment.aiRecommendation.profit || 0)}</div>
                            <div>CO₂: {Math.round(shipment.aiRecommendation.co2 || 0)} kg</div>
                            <div>Delay: {Math.round((shipment.aiRecommendation.delay || 0) * 10) / 10} days</div>
                          </div>
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
                            : shipment.status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {shipment.status || "pending"}
                      </span>
                      {shipment.approvedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Approved: {new Date(shipment.approvedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : "N/A"}</div>
                      <div className="text-xs text-gray-400">
                        {shipment.createdAt ? new Date(shipment.createdAt).toLocaleTimeString() : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/shipments/${shipment._id}`)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {loading && shipments.length > 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            Refreshing...
          </div>
        )}
      </div>
    </div>
  );
}

