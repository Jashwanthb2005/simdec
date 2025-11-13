import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Shipments from "./pages/Shipments";
import ShipmentCreate from "./pages/ShipmentCreate";
import ShipmentDetail from "./pages/ShipmentDetail";
import Inference from "./pages/Inference";
import Results from "./pages/Results";
import BulkUpload from "./components/Shipment/BulkUpload";
import AIChatbot from "./components/Chatbot/AIChatbot";
import Navbar from "./components/Layout/Navbar";
import Sidebar from "./components/Layout/Sidebar";

function AppContent() {
  const [result, setResult] = useState(() => {
    const saved = localStorage.getItem('inferenceResult');
    return saved ? JSON.parse(saved) : null;
  });

  const runInference = async (form) => {
    try {
      const response = await fetch("https://sim-dec-server2.onrender.com/api/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          order_country: "India",
          customer_country: "India",
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setResult(data);
      localStorage.setItem('inferenceResult', JSON.stringify(data));
      return data;
    } catch (err) {
      console.error("Inference failed:", err);
      alert("Inference failed — check backend and FastAPI service.");
      throw err;
    }
  };

  const resetResult = () => {
    setResult(null);
    localStorage.removeItem('inferenceResult');
  };

  return (
    <>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Homepage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Public inference routes (for demo) */}
      <Route 
        path="/inference" 
        element={<Inference onSubmit={runInference} />} 
      />
      <Route 
        path="/results" 
        element={
          result ? (
            <Results 
              result={result} 
              onReset={resetResult} 
            />
          ) : (
            <Navigate to="/inference" replace />
          )
        } 
      />

      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics" 
        element={
          <ProtectedRoute allowedRoles={["analyst", "manager", "admin"]}>
            <Analytics />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Admin />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/shipments" 
        element={
          <ProtectedRoute allowedRoles={["manager", "operator", "admin"]}>
            <Shipments />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/shipments/create" 
        element={
          <ProtectedRoute allowedRoles={["operator", "admin"]}>
            <ShipmentCreate />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/shipments/:id" 
        element={
          <ProtectedRoute>
            <ShipmentDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/shipments/bulk-upload" 
        element={
          <ProtectedRoute allowedRoles={["operator", "admin"]}>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <div className="flex">
                <Sidebar />
                <main className="flex-1 p-8">
                  <BulkUpload />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } 
      />
      </Routes>
      
      {/* AI Chatbot - available on all pages (outside Routes) */}
      <AIChatbot />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
