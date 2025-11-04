import ShipmentList from "../components/Shipment/ShipmentList";
import Navbar from "../components/Layout/Navbar";
import Sidebar from "../components/Layout/Sidebar";

export default function Shipments() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <ShipmentList />
        </main>
      </div>
    </div>
  );
}

