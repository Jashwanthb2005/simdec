import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shipmentAPI } from "../../api/backendAPI";

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your AI logistics assistant. I can help you with:\n- Checking shipment delays\n- Analyzing routes\n- Getting recommendations\n- Understanding metrics\n\nHow can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages([...messages, userMessage]);
    setInput("");
    setLoading(true);

    // Simulate AI response (in production, connect to a real chatbot API)
    setTimeout(() => {
      const response = generateAIResponse(input);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setLoading(false);
    }, 1000);
  };

  const generateAIResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();

    // Route analysis
    if (lowerInput.includes("route") || lowerInput.includes("delay") || lowerInput.includes("mumbai")) {
      return "Based on current data, routes from Mumbai to Delhi show:\n- Average delay: 2.3 days\n- Best mode: Rail for long distances\n- Weather impact: Low (clear conditions)\n\nWould you like me to analyze a specific route?";
    }

    // Recommendations
    if (lowerInput.includes("recommend") || lowerInput.includes("suggest") || lowerInput.includes("best")) {
      return "For optimal shipping:\n✅ Use Rail for distances >800km\n✅ Air for urgent (<24h) shipments\n✅ Ship for heavy cargo\n✅ Standard for local deliveries\n\nCurrent fuel prices favor Rail transport.";
    }

    // Metrics
    if (lowerInput.includes("co2") || lowerInput.includes("emission") || lowerInput.includes("carbon")) {
      return "CO₂ Metrics:\n- Average per shipment: 4,200 kg\n- Rail: Lowest emissions\n- Air: Highest emissions\n- This month's savings: 2.1 tons\n\nWant to see detailed analytics?";
    }

    // Profit
    if (lowerInput.includes("profit") || lowerInput.includes("cost") || lowerInput.includes("price")) {
      return "Profit Analysis:\n- Average profit: ₹52 per shipment\n- Highest: Same Day delivery\n- Most cost-effective: Standard Class\n- Fuel surge impact: +5% on Air transport\n\nCheck the Analytics dashboard for more details.";
    }

    // Weather
    if (lowerInput.includes("weather") || lowerInput.includes("rain") || lowerInput.includes("storm")) {
      return "Current Weather Status:\n- Most routes: Clear conditions\n- Weather score: 0.85/1.0\n- No major disruptions expected\n- Shipping conditions: Favorable\n\nI can check specific locations if needed.";
    }

    // Fuel
    if (lowerInput.includes("fuel") || lowerInput.includes("gas") || lowerInput.includes("price")) {
      return "Fuel Index: 1.008\n- Status: Normal range\n- Change: +2% this week\n- Impact: Minimal on recommendations\n- Best mode: Rail (less fuel-dependent)\n\nFuel prices are stable.";
    }

    // Default response
    return "I understand you're asking about: " + userInput + "\n\nI can help with:\n- Route analysis\n- Shipping recommendations\n- CO₂ metrics\n- Profit analysis\n- Weather conditions\n- Fuel prices\n\nCould you be more specific?";
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-50 transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-96 bg-white rounded-xl shadow-2xl z-50 flex flex-col"
            style={{ height: "500px" }}
          >
            <div className="bg-blue-600 text-white p-4 rounded-t-xl flex justify-between items-center">
              <h3 className="font-semibold">AI Logistics Assistant</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="whitespace-pre-line text-sm">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


