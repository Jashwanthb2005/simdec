import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: "📊", roles: ["manager", "operator", "analyst", "admin"] },
    { path: "/shipments", label: "Shipments", icon: "📦", roles: ["manager", "operator", "admin"] },
    { path: "/shipments/create", label: "Create Shipment", icon: "➕", roles: ["operator", "admin"] },
    { path: "/shipments/bulk-upload", label: "Bulk Upload", icon: "📤", roles: ["operator", "admin"] },
    { path: "/analytics", label: "Analytics", icon: "📈", roles: ["analyst", "manager", "admin"] },
    { path: "/admin", label: "Admin Panel", icon: "⚙️", roles: ["admin"] },
  ].filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <aside className="w-64 bg-white shadow-lg min-h-screen">
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-blue-50 text-blue-600 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

