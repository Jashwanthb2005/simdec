import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { shipmentAPI } from "../../api/backendAPI";
import { motion } from "framer-motion";

export default function BulkUpload() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
    } else {
      alert("Please select a CSV file");
    }
  };

  const parseCSV = (csvText) => {
    const lines = csvText.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    const shipments = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(",").map((v) => v.trim());
        const shipment = {};
        headers.forEach((header, idx) => {
          shipment[header] = values[idx];
        });
        shipments.push(shipment);
      }
    }

    return shipments;
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a CSV file");
      return;
    }

    setUploading(true);
    setProgress(0);
    setResults({ success: 0, failed: 0, errors: [] });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvText = e.target.result;
        const shipments = parseCSV(csvText);

        let successCount = 0;
        let failedCount = 0;
        const errors = [];

        for (let i = 0; i < shipments.length; i++) {
          const shipment = shipments[i];
          setProgress(Math.round(((i + 1) / shipments.length) * 100));

          try {
            // Map CSV columns to API format
            const shipmentData = {
              order_city: shipment.order_city || shipment.origin_city || shipment.from_city,
              order_country: shipment.order_country || shipment.origin_country || "India",
              customer_city: shipment.customer_city || shipment.destination_city || shipment.to_city,
              customer_country: shipment.customer_country || shipment.destination_country || "India",
              sales_per_customer: parseFloat(shipment.sales_per_customer || shipment.sales || 500),
              urgency: shipment.urgency || "normal",
              notes: shipment.notes || "",
            };

            await shipmentAPI.create(shipmentData);
            successCount++;
          } catch (error) {
            failedCount++;
            errors.push({
              row: i + 2, // +2 because of header and 0-indexing
              error: error.response?.data?.error || "Unknown error",
              data: shipment,
            });
          }

          // Small delay to avoid overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        setResults({
          success: successCount,
          failed: failedCount,
          errors,
        });
        setUploading(false);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to process CSV file");
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `order_city,order_country,customer_city,customer_country,sales_per_customer,urgency,notes
Mumbai,India,Delhi,India,500,normal,First shipment
Bangalore,India,Chennai,India,750,high,Urgent delivery
Hyderabad,India,Pune,India,300,normal,Regular shipment`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shipment_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl w-full">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Bulk Shipment Upload</h2>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Upload a CSV file with multiple shipments to create them in bulk.
        </p>
        <button
          onClick={downloadTemplate}
          className="text-blue-600 hover:text-blue-700 text-sm underline mb-4"
        >
          📥 Download CSV Template
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select CSV File
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          disabled={uploading}
        />
        {file && (
          <p className="text-sm text-gray-600 mt-2">
            Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      {uploading && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg border"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Upload Results</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">{results.success}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">{results.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
          {results.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-2">Errors:</h4>
              <div className="max-h-40 overflow-y-auto">
                {results.errors.map((error, idx) => (
                  <div key={idx} className="text-sm text-red-600 mb-1">
                    Row {error.row}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : "Upload CSV"}
        </button>
        <button
          onClick={() => navigate("/shipments")}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg"
        >
          Cancel
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">CSV Format:</h4>
        <p className="text-sm text-gray-600">
          Required columns: order_city, order_country, customer_city, customer_country, sales_per_customer
          <br />
          Optional columns: urgency, notes
        </p>
      </div>
    </div>
  );
}


