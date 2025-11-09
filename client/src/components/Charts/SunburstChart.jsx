import { useState, useMemo } from "react";
import { hierarchy, partition } from "d3-hierarchy";
import { arc } from "d3-shape";

export default function SunburstChart({ data, width = 400, height = 400 }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Build hierarchical data structure
  const rootData = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    // Create hierarchy: Mode -> Status -> Route
    const hierarchyMap = {};

    data.forEach((shipment) => {
      const mode = shipment.aiRecommendation?.mode || shipment.finalMode || "Unknown";
      const status = shipment.status || "pending";
      const route = `${shipment.origin || shipment.order_city || "Unknown"} → ${shipment.destination || shipment.customer_city || "Unknown"}`;

      if (!hierarchyMap[mode]) {
        hierarchyMap[mode] = {
          name: mode,
          value: 0,
          children: {},
        };
      }

      if (!hierarchyMap[mode].children[status]) {
        hierarchyMap[mode].children[status] = {
          name: status,
          value: 0,
          children: [],
        };
      }

      hierarchyMap[mode].value += 1;
      hierarchyMap[mode].children[status].value += 1;
      hierarchyMap[mode].children[status].children.push({
        name: route,
        value: 1,
        profit: shipment.aiRecommendation?.profit || 0,
        co2: shipment.aiRecommendation?.co2 || 0,
      });
    });

    // Convert to d3 hierarchy format
    const root = {
      name: "Shipments",
      children: Object.values(hierarchyMap).map((mode) => ({
        name: mode.name,
        value: mode.value,
        children: Object.values(mode.children).map((status) => ({
          name: status.name,
          value: status.value,
          children: status.children,
        })),
      })),
    };

    try {
      return hierarchy(root)
        .sum((d) => d.value || 0)
        .sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error("Error creating hierarchy:", error);
      return null;
    }
  }, [data]);

  const partitionData = useMemo(() => {
    if (!rootData) return null;
    try {
      const radius = Math.min(width, height) / 2 - 20;
      return partition().size([2 * Math.PI, radius])(rootData);
    } catch (error) {
      console.error("Error creating partition:", error);
      return null;
    }
  }, [rootData, width, height]);

  const colorScale = (depth, index) => {
    const colors = {
      0: ["#3b82f6"], // Root
      1: ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"], // Modes
      2: ["#34d399", "#fbbf24", "#f87171", "#a78bfa"], // Status
      3: ["#6ee7b7", "#fcd34d", "#fca5a5", "#c4b5fd"], // Routes
    };
    const palette = colors[depth] || colors[1];
    return palette[index % palette.length];
  };

  const arcGenerator = arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .innerRadius((d) => d.y0)
    .outerRadius((d) => d.y1);

  const handleClick = (node) => {
    setSelectedNode(node);
  };

  if (!partitionData || !rootData) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No data available for sunburst chart</p>
          <p className="text-xs mt-2">Create shipments to see visualization</p>
        </div>
      </div>
    );
  }

  const nodes = partitionData.descendants().filter((d) => d.depth > 0);

  return (
    <div className="relative w-full flex flex-col items-center">
      <svg width={width} height={height} className="mx-auto" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%', height: 'auto' }}>
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {nodes.map((node, i) => {
            try {
              const path = arcGenerator(node);
              if (!path) return null;

              const angle = ((node.x0 + node.x1) / 2) * 180 / Math.PI;
              const radius = (node.y0 + node.y1) / 2;
              const shouldRotate = angle > 90 && angle < 270;

              return (
                <g key={`node-${i}-${node.data.name}-${node.depth}`}>
                  <path
                    d={path}
                    fill={colorScale(node.depth, i)}
                    fillOpacity={0.8}
                    stroke="#fff"
                    strokeWidth={node.depth === 1 ? 3 : 2}
                    onClick={() => handleClick(node)}
                    onMouseEnter={() => handleClick(node)}
                    style={{ cursor: "pointer" }}
                    className="hover:opacity-90 transition-opacity"
                  >
                    <title>
                      {node.data.name}: {Math.round(node.value)} shipments
                    </title>
                  </path>
                  {node.depth === 1 && (node.x1 - node.x0) > 0.2 && (
                    <text
                      transform={`rotate(${angle - 90}) translate(${radius}, 0) rotate(${shouldRotate ? 180 : 0})`}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#fff"
                      fontWeight="bold"
                      pointerEvents="none"
                      stroke="#000"
                      strokeWidth="0.5"
                    >
                      {node.data.name}
                    </text>
                  )}
                </g>
              );
            } catch (error) {
              console.error("Error rendering node:", error, node);
              return null;
            }
          })}
        </g>
      </svg>
      
      {selectedNode && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-2">{selectedNode.data.name}</h4>
          <p className="text-sm text-gray-600">
            Shipments: <strong>{Math.round(selectedNode.value)}</strong>
          </p>
          {selectedNode.data.profit !== undefined && selectedNode.data.profit > 0 && (
            <p className="text-sm text-gray-600">
              Profit: <strong>₹{Math.round(selectedNode.data.profit)}</strong>
            </p>
          )}
          {selectedNode.data.co2 !== undefined && selectedNode.data.co2 > 0 && (
            <p className="text-sm text-gray-600">
              CO₂: <strong>{Math.round(selectedNode.data.co2)} kg</strong>
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Depth: {selectedNode.depth} | Click segments to explore
          </p>
        </div>
      )}
    </div>
  );
}
