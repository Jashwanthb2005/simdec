import AnalystDashboard from "../components/Dashboard/AnalystDashboard";
import Navbar from "../components/Layout/Navbar";
import Sidebar from "../components/Layout/Sidebar";

export default function Analytics() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <AnalystDashboard />
        </main>
      </div>
    </div>
  );
}

