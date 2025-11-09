import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";

export default function ProfitTrend({ data }) {
  const chartData = data.map((item) => ({
    date: new Date(item.createdAt).toLocaleDateString(),
    profit: Math.round(item.aiRecommendation?.profit || 0),
    mode: item.aiRecommendation?.mode || "N/A",
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis label={{ value: "Profit (₹)", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="profit"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.3}
          name="Profit (₹)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}


