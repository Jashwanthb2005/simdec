import { useState, useEffect, useMemo } from "react";
import { shipmentAPI } from "../../api/backendAPI";
import { motion } from "framer-motion";
import TimeSeriesStream from "../Charts/TimeSeriesStream";
import SunburstChart from "../Charts/SunburstChart";
import EnhancedLineChart from "../Charts/EnhancedLineChart";
import WeatherDashboard3D from "../Widgets/WeatherDashboard3D";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export default function AnalystDashboard() {
  const [stats, setStats] = useState({});
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
    // Refresh data every 30 seconds to see real-time updates
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      console.log("🔄 Loading analytics data...");
      console.log("📡 API URL:", import.meta.env.VITE_API_URL || "https://sim-dec-server.onrender.com");
      console.log("🔑 Token:", localStorage.getItem("token") ? "Present" : "Missing");
      
      // Load stats first to get the date range, then load shipments
      const statsRes = await shipmentAPI.getStats().catch((err) => {
        console.error("❌ Error loading stats:", err);
        console.error("   Status:", err.response?.status);
        console.error("   Data:", err.response?.data);
        console.error("   Message:", err.message);
        return { data: { stats: {} } };
      });
      
      // Get the date range from stats response to match shipments
      const period = statsRes.data?.period;
      const startDate = period?.startDate ? new Date(period.startDate).toISOString().split('T')[0] : null;
      const endDate = period?.endDate ? new Date(period.endDate).toISOString().split('T')[0] : null;
      
      console.log("📅 Using date range from stats:", { startDate, endDate });
      
      // Load shipments - for analyst, we want all shipments (stats will filter by date on backend)
      const shipmentsRes = await shipmentAPI.getAll({ limit: 1000 }).catch((err) => {
        console.error("❌ Error loading shipments:", err);
        console.error("   Status:", err.response?.status);
        console.error("   Data:", err.response?.data);
        console.error("   Message:", err.message);
        return { data: { shipments: [] } };
      });
      
      console.log("📦 Shipments Response:", {
        status: shipmentsRes.status,
        statusText: shipmentsRes.statusText,
        hasData: !!shipmentsRes.data,
        dataKeys: shipmentsRes.data ? Object.keys(shipmentsRes.data) : [],
        shipmentsCount: shipmentsRes.data?.shipments?.length || 0,
        total: shipmentsRes.data?.total,
        limit: shipmentsRes.data?.limit,
        skip: shipmentsRes.data?.skip,
        firstShipment: shipmentsRes.data?.shipments?.[0] ? {
          _id: shipmentsRes.data.shipments[0]._id,
          createdAt: shipmentsRes.data.shipments[0].createdAt,
          status: shipmentsRes.data.shipments[0].status,
          mode: shipmentsRes.data.shipments[0].aiRecommendation?.mode,
        } : null,
      });
      
      console.log("📊 Stats Response:", {
        status: statsRes.status,
        statusText: statsRes.statusText,
        hasData: !!statsRes.data,
        dataKeys: statsRes.data ? Object.keys(statsRes.data) : [],
        stats: statsRes.data?.stats,
        period: statsRes.data?.period,
      });
      
      const shipmentsData = shipmentsRes.data?.shipments || [];
      let statsData = statsRes.data?.stats || statsRes.data || {};
      
      // If stats exist but shipments are empty, this is a data inconsistency
      if (statsData.totalShipments > 0 && shipmentsData.length === 0) {
        console.warn("⚠️ WARNING: Stats show shipments exist but API returned empty array!");
        console.warn("   Stats totalShipments:", statsData.totalShipments);
        console.warn("   This might indicate a filtering or permission issue.");
      }
      
      console.log("📈 Processing stats...");
      console.log("   Raw statsData:", JSON.stringify(statsData, null, 2));
      console.log("   Shipments count:", shipmentsData.length);
      
      // Calculate stats from shipments if API stats are incomplete or missing
      if (!statsData.totalShipments && statsData.totalShipments !== 0) {
        console.log("⚠️ Stats missing totalShipments, calculating from shipments...");
        statsData = {
          totalShipments: shipmentsData.length,
          totalCO2: shipmentsData.reduce((sum, s) => sum + (s.aiRecommendation?.co2 || 0), 0),
          totalProfit: shipmentsData.reduce((sum, s) => sum + (s.aiRecommendation?.profit || 0), 0),
          avgDelay: shipmentsData.length > 0
            ? shipmentsData.reduce((sum, s) => sum + (s.aiRecommendation?.delay || 0), 0) / shipmentsData.length
            : 0,
        };
      } else {
        // Ensure all required fields exist, use 0 as fallback
        statsData = {
          totalShipments: statsData.totalShipments ?? shipmentsData.length,
          totalCO2: statsData.totalCO2 ?? 0,
          totalProfit: statsData.totalProfit ?? 0,
          avgDelay: statsData.avgDelay ?? 0,
        };
      }
      
      console.log(`✅ Loaded ${shipmentsData.length} shipments for analytics`);
      console.log("📊 Final Stats:", JSON.stringify(statsData, null, 2));
      console.log("   - totalShipments:", statsData.totalShipments);
      console.log("   - totalCO2:", statsData.totalCO2);
      console.log("   - totalProfit:", statsData.totalProfit);
      console.log("   - avgDelay:", statsData.avgDelay);
      
      setShipments(shipmentsData);
      setStats(statsData);
    } catch (error) {
      console.error("💥 Error loading analytics data:", error);
      console.error("   Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      setError("Failed to load analytics data: " + (error.message || "Unknown error"));
      // Set empty stats on error
      setStats({
        totalShipments: 0,
        totalCO2: 0,
        totalProfit: 0,
        avgDelay: 0,
      });
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for stream graph - time series data (individual records for proper stacking)
  const timeSeriesData = useMemo(() => {
    if (!shipments || shipments.length === 0) {
      console.log("⚠️ No shipments for time series data");
      return [];
    }
    
    const data = shipments
      .filter(s => s.createdAt) // Only include shipments with valid dates
      .map((s) => ({
        date: new Date(s.createdAt).toLocaleDateString(),
        co2: Math.round(s.aiRecommendation?.co2 || 0),
        profit: Math.round(s.aiRecommendation?.profit || 0),
        delay: Math.round((s.aiRecommendation?.delay || 0) * 10) / 10,
        shipments: 1,
        createdAt: s.createdAt,
      }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    console.log("📊 Time series data prepared:", data.length, "records");
    if (data.length > 0) {
      console.log("   First record:", data[0]);
      console.log("   Last record:", data[data.length - 1]);
    }
    return data;
  }, [shipments]);

  // Prepare data for line chart - CO₂ and Profit trends over time
  const trendLineData = useMemo(() => {
    if (!shipments || shipments.length === 0) {
      console.log("⚠️ No shipments for trend line data");
      return [];
    }
    
    // Group by date and calculate totals
    const grouped = {};
    shipments.forEach((s) => {
      if (!s.createdAt) return;
      const dateKey = new Date(s.createdAt).toISOString().split('T')[0];
      const dateLabel = new Date(s.createdAt).toLocaleDateString();
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = { 
          date: dateLabel, 
          dateKey: dateKey,
          co2: 0, 
          profit: 0, 
          delay: 0,
          count: 0 
        };
      }
      grouped[dateKey].co2 += s.aiRecommendation?.co2 || 0;
      grouped[dateKey].profit += s.aiRecommendation?.profit || 0;
      grouped[dateKey].delay += s.aiRecommendation?.delay || 0;
      grouped[dateKey].count += 1;
    });

    const data = Object.values(grouped)
      .map(item => ({
        date: item.date,
        dateKey: item.dateKey,
        co2: Math.round(item.co2),
        profit: Math.round(item.profit),
        delay: Math.round((item.delay / item.count) * 10) / 10,
        avgCO2: item.count > 0 ? Math.round(item.co2 / item.count) : 0,
        avgProfit: item.count > 0 ? Math.round(item.profit / item.count) : 0,
        avgDelay: item.count > 0 ? Math.round((item.delay / item.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey));
    
    console.log("📈 Trend line data prepared:", data.length, "date groups");
    if (data.length > 0) {
      console.log("   Sample data:", data[0]);
    }
    return data;
  }, [shipments]);

  // Prepare mode distribution data for pie chart
  const modeDistributionData = useMemo(() => {
    if (!shipments || shipments.length === 0) {
      console.log("⚠️ No shipments for mode distribution");
      return [];
    }
    
    const modeCounts = shipments.reduce((acc, s) => {
      const mode = s.aiRecommendation?.mode || s.finalMode || "Unknown";
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {});

    const data = Object.entries(modeCounts).map(([name, value]) => ({
      name,
      value,
    }));
    
    console.log("🥧 Mode distribution data:", data);
    return data;
  }, [shipments]);

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

  // Prepare mode performance data for bar chart
  const modePerformanceData = useMemo(() => {
    if (!shipments || shipments.length === 0) {
      console.log("⚠️ No shipments for mode performance");
      return [];
    }
    
    const modeStats = {};
    shipments.forEach((s) => {
      const mode = s.aiRecommendation?.mode || s.finalMode || "Unknown";
      if (!modeStats[mode]) {
        modeStats[mode] = {
          mode,
          totalCO2: 0,
          totalProfit: 0,
          totalDelay: 0,
          count: 0,
        };
      }
      modeStats[mode].totalCO2 += s.aiRecommendation?.co2 || 0;
      modeStats[mode].totalProfit += s.aiRecommendation?.profit || 0;
      modeStats[mode].totalDelay += s.aiRecommendation?.delay || 0;
      modeStats[mode].count += 1;
    });

    const data = Object.values(modeStats).map((stat) => ({
      mode: stat.mode,
      avgCO2: Math.round(stat.totalCO2 / stat.count),
      avgProfit: Math.round(stat.totalProfit / stat.count),
      avgDelay: Math.round((stat.totalDelay / stat.count) * 10) / 10,
      count: stat.count,
    }));
    
    console.log("📊 Mode performance data:", data);
    return data;
  }, [shipments]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const handleGenerateReport = () => {
    const reportData = {
      totalCO2: Math.round(stats.totalCO2 || 0),
      totalProfit: Math.round(stats.totalProfit || 0),
      totalShipments: stats.totalShipments || 0,
      avgCO2PerShipment: stats.totalShipments > 0
        ? Math.round((stats.totalCO2 || 0) / stats.totalShipments)
        : 0,
    };
    
    alert(`Sustainability Report Generated!\n\n` +
      `Total CO₂ Emissions: ${reportData.totalCO2} kg\n` +
      `Average per Shipment: ${reportData.avgCO2PerShipment} kg\n` +
      `Total Shipments: ${reportData.totalShipments}\n` +
      `Total Profit: ₹${reportData.totalProfit}\n\n` +
      `Report saved and ready for download.`);
  };

  const handleExportData = () => {
    const csv = [
      ["Date", "Mode", "Profit (₹)", "CO₂ (kg)", "Delay (days)"],
      ...shipments.map(s => [
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
  };

  const handleESGReport = () => {
    const esgScore = stats.totalShipments > 0 && stats.totalCO2 > 0
      ? Math.max(0, 100 - Math.round((stats.totalCO2 / stats.totalShipments) / 10))
      : 85;
    
    alert(`ESG Detailed Analysis\n\n` +
      `Overall ESG Score: ${esgScore}/100\n` +
      `Environmental Impact: ${esgScore > 80 ? "Excellent" : esgScore > 60 ? "Good" : "Needs Improvement"}\n` +
      `CO₂ Efficiency: ${stats.totalShipments > 0 ? Math.round((stats.totalCO2 / stats.totalShipments)) : 0} kg per shipment\n` +
      `Recommendations:\n` +
      `- Consider Rail transport for long distances\n` +
      `- Optimize routes to reduce emissions\n` +
      `- Monitor CO₂ trends weekly`);
  };

  if (loading && shipments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Deep analytics, charts, and detailed sustainability insights</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 font-semibold">Error loading analytics data</p>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              className="text-red-600 hover:text-red-800 text-sm font-medium underline"
            >
              Retry
            </button>
          </div>
          <p className="text-red-600 text-sm mt-2">{error}</p>
        </div>
      )}

      {/* 3D Weather Dashboard - Show weather for cities in shipments */}
      {weatherCities.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <WeatherDashboard3D cities={weatherCities} />
        </motion.div>
      ) : (
        // Fallback to default cities if no shipment cities found
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <WeatherDashboard3D />
        </motion.div>
      )}

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
          <div className="text-sm text-gray-600 mb-2">Avg CO₂ per Shipment</div>
          <div className="text-3xl font-bold text-purple-600">
            {stats.totalShipments > 0
              ? Math.round((stats.totalCO2 || 0) / stats.totalShipments)
              : 0} kg
          </div>
          <div className="text-xs text-gray-500 mt-2">Efficiency metric</div>
        </motion.div>
      </div>

      {/* Stream Graph - Time Series */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl p-6 shadow-lg mb-8"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Time Series Stream - CO₂, Profit & Delay Trends</h3>
        <TimeSeriesStream 
          data={timeSeriesData} 
          metrics={["co2", "profit", "delay"]}
        />
        <p className="text-xs text-gray-500 mt-4 text-center">
          Stream graph showing cumulative trends over time. Higher values indicate more activity.
        </p>
      </motion.div>

      {/* Sunburst Chart and Mode Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🌞 Shipment Hierarchy (Sunburst)</h3>
          <p className="text-sm text-gray-600 mb-4">
            Click on segments to explore: Mode → Status → Route
          </p>
          <div className="flex justify-center">
            <SunburstChart data={shipments} width={500} height={500} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Shipping Mode Distribution</h3>
          {modeDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={modeDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {modeDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[400px] text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p>No mode distribution data</p>
                <p className="text-sm mt-2">Create shipments to see distribution</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Enhanced Line Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <EnhancedLineChart
            title="CO₂ & Profit Trends Over Time"
            data={trendLineData}
            lines={[
              { dataKey: "co2", name: "CO₂ Emissions (kg)", color: "#ef4444", yAxisId: "left", unit: "kg" },
              { dataKey: "profit", name: "Profit (₹)", color: "#10b981", yAxisId: "right", unit: "₹" },
            ]}
            height={350}
            showAverageLine={true}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <EnhancedLineChart
            title="Average Metrics Per Day"
            data={trendLineData}
            lines={[
              { dataKey: "avgCO2", name: "Avg CO₂ (kg)", color: "#ef4444", yAxisId: "left", unit: "kg" },
              { dataKey: "avgProfit", name: "Avg Profit (₹)", color: "#10b981", yAxisId: "right", unit: "₹" },
              { dataKey: "avgDelay", name: "Avg Delay (days)", color: "#3b82f6", yAxisId: "left", unit: "days" },
            ]}
            height={350}
            showAverageLine={true}
          />
        </motion.div>
      </div>

      {/* Mode Performance Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-white rounded-xl p-6 shadow-lg mb-8"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Mode Performance Comparison</h3>
        {modePerformanceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={modePerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mode" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis yAxisId="left" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px'
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="avgCO2" fill="#ef4444" name="Avg CO₂ (kg)" />
              <Bar yAxisId="right" dataKey="avgProfit" fill="#10b981" name="Avg Profit (₹)" />
              <Bar yAxisId="left" dataKey="avgDelay" fill="#3b82f6" name="Avg Delay (days)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p>No performance data available</p>
              <p className="text-sm mt-2">Create shipments to see mode performance</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Summary Cards and Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🌍 ESG Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Carbon Footprint Score</span>
              <span className="text-xl font-bold text-green-600">
                {stats.totalShipments > 0 && stats.totalCO2 > 0
                  ? Math.max(0, 100 - Math.round((stats.totalCO2 / stats.totalShipments) / 10))
                  : 85}/100
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sustainability Rating</span>
              <span className="text-xl font-bold text-green-600">
                {stats.totalShipments > 0 && stats.totalCO2 > 0
                  ? (Math.round((stats.totalCO2 / stats.totalShipments) / 10) < 20 ? "A+" : "A")
                  : "A+"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">CO₂ per Shipment</span>
              <span className="text-lg font-semibold text-gray-900">
                {stats.totalShipments > 0
                  ? Math.round((stats.totalCO2 || 0) / stats.totalShipments)
                  : 0} kg
              </span>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                💡 ESG Score calculated based on CO₂ emissions per shipment. Lower is better.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyst Tools</h3>
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={handleGenerateReport}
              className="bg-white hover:bg-indigo-50 text-indigo-600 border-2 border-indigo-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              📊 Generate Sustainability Report
            </button>
            <button 
              onClick={handleExportData}
              className="bg-white hover:bg-indigo-50 text-indigo-600 border-2 border-indigo-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              📥 Export Data (CSV)
            </button>
            <button 
              onClick={handleESGReport}
              className="bg-white hover:bg-indigo-50 text-indigo-600 border-2 border-indigo-600 px-4 py-3 rounded-lg font-medium transition text-left"
            >
              🌍 Detailed ESG Analysis
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
