import { useState } from "react";

export default function Landing({ onSubmit }) {
  const [form, setForm] = useState({
    order_city: "",
    customer_city: "",
    sales_per_customer: 500,
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4 text-blue-700">
          Sim-to-Dec Inference
        </h1>
        <p className="mb-6 text-gray-600 text-sm">
          Enter logistics parameters to predict profit, delay, and CO₂ impact.
        </p>

        <div className="space-y-4">
          <input
            className="border border-gray-300 rounded-lg p-2 w-full"
            placeholder="Origin City"
            onChange={(e) => setForm({ ...form, order_city: e.target.value })}
          />
          <input
            className="border border-gray-300 rounded-lg p-2 w-full"
            placeholder="Destination City"
            onChange={(e) => setForm({ ...form, customer_city: e.target.value })}
          />
          <input
            type="number"
            className="border border-gray-300 rounded-lg p-2 w-full"
            placeholder="Sales per Customer"
            onChange={(e) =>
              setForm({ ...form, sales_per_customer: +e.target.value })
            }
          />
          <button
            onClick={() => onSubmit(form)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 w-full rounded-lg"
          >
            Run Inference
          </button>
        </div>
      </div>
    </div>
  );
}
