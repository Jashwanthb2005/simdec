import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function CO2Chart({ data }) {
  const chartData = data.map((item) => ({
    date: new Date(item.createdAt).toLocaleDateString(),
    co2: Math.round(item.aiRecommendation?.co2 || 0),
    mode: item.aiRecommendation?.mode || "N/A",
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis label={{ value: "CO₂ (kg)", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="co2"
          stroke="#ef4444"
          strokeWidth={2}
          name="CO₂ Emissions (kg)"
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}


