import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

export default function StreamGraph({ data, metrics = ["co2", "profit", "delay"] }) {
  // Prepare data for stream graph (stacked area chart)
  // Group by date and stack metrics
  const processedData = data.map((item, index) => {
    const point = {
      date: item.date || `Day ${index + 1}`,
      index: index,
    };
    
    // Add each metric as a separate value
    metrics.forEach(metric => {
      if (item[metric] !== undefined) {
        point[metric] = item[metric];
      }
    });
    
    return point;
  });

  const colors = {
    co2: "#ef4444",
    profit: "#10b981",
    delay: "#3b82f6",
    shipments: "#8b5cf6",
  };

  const names = {
    co2: "CO₂ (kg)",
    profit: "Profit (₹)",
    delay: "Delay (days)",
    shipments: "Shipments",
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={processedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          {metrics.map(metric => (
            <linearGradient key={metric} id={`color${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[metric] || "#8884d8"} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={colors[metric] || "#8884d8"} stopOpacity={0.1}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '10px'
          }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
        />
        {metrics.map((metric, index) => (
          <Area
            key={metric}
            type="monotone"
            dataKey={metric}
            stackId={metric === "profit" || metric === "co2" ? "1" : "2"}
            stroke={colors[metric] || "#8884d8"}
            fill={`url(#color${metric})`}
            name={names[metric] || metric}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

