import AdminPanel from "../components/Dashboard/AdminPanel";
import Navbar from "../components/Layout/Navbar";
import Sidebar from "../components/Layout/Sidebar";

export default function Admin() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <AdminPanel />
        </main>
      </div>
    </div>
  );
}

