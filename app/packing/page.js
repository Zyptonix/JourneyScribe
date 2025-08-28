"use client";
import { useState } from "react";

export default function PackingAssistant() {
  const [destination, setDestination] = useState("");
  const [weather, setWeather] = useState("");
  const [activities, setActivities] = useState("");
  const [result, setResult] = useState(null);

  const getRecommendations = async () => {
    const res = await fetch("/api/packing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination,
        weather,
        activities: activities.split(",").map((a) => a.trim().toLowerCase()),
      }),
    });
    const data = await res.json();
    setResult(data);
  };

  return (
    
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 via-teal-500 to-blue-600 p-6">
            {/* Background Image for the top 80% of the viewport, now FIXED */}
      <div
        className="fixed inset-x-0 top-0 h-[100vh] bg-cover bg-center" // Changed to fixed position
        style={{
          backgroundImage: "url('/assets/weathercng.jpg')", // Placeholder image
          filter: "blur(2px)", // Re-add blur if desired, removed as per previous update
          transform: "scale(1.05)" // Slightly scale to avoid blurry edges
        }}
      ></div>
            <div className="fixed inset-x-0 top-0 h-[100vh] bg-black opacity-20 "></div>
      <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-white/30">
        <h2 className="text-2xl font-bold text-white mb-6">🎒 Packing Assistant</h2>

        {/* Destination */}
        <input
          type="text"
          placeholder="Destination (e.g. London)"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="w-full p-3 rounded-xl mb-4 bg-white/30 text-black"
        />

        {/* Weather */}
        <select
          value={weather}
          onChange={(e) => setWeather(e.target.value)}
          className="w-full p-3 rounded-xl mb-4 bg-white/30 text-black"
        >
          <option value="">Select Weather</option>
          <option value="Sunny">☀️ Sunny</option>
          <option value="Rain">🌧 Rainy</option>
          <option value="Snow">❄️ Snowy</option>
          <option value="Cloudy">☁️ Cloudy</option>
        </select>

        {/* Activities */}
        <input
          type="text"
          placeholder="Activities (comma separated, e.g. hiking, swimming)"
          value={activities}
          onChange={(e) => setActivities(e.target.value)}
          className="w-full p-3 rounded-xl mb-4 bg-white/30 text-black"
        />

        {/* Button */}
        <button
          onClick={getRecommendations}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:opacity-90"
        >
          Get Packing List
        </button>

        {/* Result */}
        {result && result.success && (
          <div className="mt-6 text-white">
            <h3 className="text-lg font-bold">Packing Recommendations:</h3>
            <ul className="list-disc list-inside mt-2">
              {result.recommendations.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
