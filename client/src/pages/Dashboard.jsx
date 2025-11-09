import { useAuth } from "../context/AuthContext";
import ManagerDashboard from "../components/Dashboard/ManagerDashboard";
import OperatorDashboard from "../components/Dashboard/OperatorDashboard";
import AnalystOverview from "../components/Dashboard/AnalystOverview";
import AdminPanel from "../components/Dashboard/AdminPanel";
import Navbar from "../components/Layout/Navbar";
import Sidebar from "../components/Layout/Sidebar";

export default function Dashboard() {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case "manager":
        return <ManagerDashboard />;
      case "operator":
        return <OperatorDashboard />;
      case "analyst":
        return <AnalystOverview />;
      case "admin":
        return <AdminPanel />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          {renderDashboard()}
        </main>
      </div>
    </div>
  );
}

