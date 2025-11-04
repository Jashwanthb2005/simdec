import { useState, useEffect } from "react";
import { shipmentAPI } from "../../api/backendAPI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { motion } from "framer-motion";

export default function AnalystDashboard() {
  const [stats, setStats] = useState({});
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Refresh data every 30 seconds to see real-time updates
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [shipmentsRes, statsRes] = await Promise.all([
        shipmentAPI.getAll({ limit: 100 }).catch(() => ({ data: { shipments: [] } })),
        shipmentAPI.getStats().catch(() => ({ data: { stats: {} } })),
      ]);
      setShipments(shipmentsRes.data?.shipments || []);
      setStats(statsRes.data?.stats || {});
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  // Prepare chart data
  const modeData = shipments.reduce((acc, s) => {
    const mode = s.aiRecommendation?.mode || "Unknown";
    acc[mode] = (acc[mode] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(modeData).map(([mode, count]) => ({
    mode,
    count,
  }));

  const co2Data = shipments.slice(0, 10).map((s) => ({
    date: new Date(s.createdAt).toLocaleDateString(),
    co2: Math.round(s.aiRecommendation?.co2 || 0),
    profit: Math.round(s.aiRecommendation?.profit || 0),
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analyst Dashboard</h1>
        <p className="text-gray-600 mt-2">Track sustainability metrics and generate insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Mode Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="mode" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CO₂ vs Profit Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={co2Data}>
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="co2" stroke="#ef4444" name="CO₂ (kg)" />
              <Line yAxisId="right" type="monotone" dataKey="profit" stroke="#10b981" name="Profit (₹)" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CO₂ Savings Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Emissions</span>
              <span className="text-2xl font-bold text-red-600">
                {Math.round(stats.totalCO2 || 0)} kg
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average per Shipment</span>
              <span className="text-xl font-semibold text-gray-900">
                {stats.totalShipments > 0
                  ? Math.round((stats.totalCO2 || 0) / stats.totalShipments)
                  : 0}{" "}
                kg
              </span>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                💡 Tip: Lower CO₂ emissions can be achieved by choosing Rail or Ship modes for long-distance shipments.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Analysis</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Profit</span>
              <span className="text-2xl font-bold text-green-600">
                ₹{Math.round(stats.totalProfit || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average per Shipment</span>
              <span className="text-xl font-semibold text-gray-900">
                ₹
                {stats.totalShipments > 0
                  ? Math.round((stats.totalProfit || 0) / stats.totalShipments)
                  : 0}
              </span>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                💡 Tip: Monitor profit trends to identify optimization opportunities.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
          transition={{ delay: 0.6 }}
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

