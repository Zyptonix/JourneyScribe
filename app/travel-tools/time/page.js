"use client";
import { useState } from "react";
import Link from "next/link";

function TimeConverter() {
  const [fromZone, setFromZone] = useState("Asia/Dhaka");
  const [toZone, setToZone] = useState("Europe/London");
  const [time, setTime] = useState("");
  const [result, setResult] = useState(null);

  const convertTime = async () => {
    const res = await fetch(
      `/api/convert-time?from=${fromZone}&to=${toZone}&time=${time || ""}`
    );
    const json = await res.json();
    if (json.success) setResult(json);
  };

  return (
    <div 
       className="min-h-screen w-full bg-center bg-cover flex items-center justify-center p-6" 
       style={{ backgroundImage: "url('/assets/plainn.jpg')" }}
    >
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/30 p-8 w-full max-w-lg">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
          ⏰ Local Time Converter
        </h2>

        {/* From Zone */}
        <div className="flex gap-3 mb-4">
          <select
            value={fromZone}
            onChange={(e) => setFromZone(e.target.value)}
            className="flex-1 p-3 rounded-xl bg-white/30 text-black focus:outline-none"
          >
            <option value="Asia/Dhaka">Asia/Dhaka</option>
            <option value="Europe/London">Europe/London</option>
            <option value="America/New_York">America/New_York</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
            <option value="Australia/Sydney">Australia/Sydney</option>
          </select>
        </div>

        {/* To Zone */}
        <div className="flex gap-3 mb-4">
          <select
            value={toZone}
            onChange={(e) => setToZone(e.target.value)}
            className="flex-1 p-3 rounded-xl bg-white/30 text-black focus:outline-none"
          >
            <option value="Europe/London">Europe/London</option>
            <option value="Asia/Dhaka">Asia/Dhaka</option>
            <option value="America/New_York">America/New_York</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
            <option value="Australia/Sydney">Australia/Sydney</option>
          </select>
        </div>

        {/* Optional Time Picker */}
        <div className="mb-6">
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/30 text-black focus:outline-none"
          />
        </div>

        {/* Convert Button */}
        <button
          onClick={convertTime}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90 shadow-lg"
        >
          Convert Time
        </button>

        {/* Result */}
        {result && (
          <div className="mt-6 text-white">
            <p className="text-lg font-semibold">
              {result.fromZone} ➝ {result.toZone}
            </p>
            <p className="mt-2 text-xl font-bold">{result.toLocal}</p>
            <p className="text-sm opacity-80">(From: {result.fromLocal})</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimePage() {
  return (
    <div>
      <TimeConverter />
      <div className="text-center mt-6">
        <Link href="/travel-tools/currency" className="text-blue-300 underline">
          ➡️ Go to Currency Converter
        </Link>
        <br />
        <Link href="/travel-tools" className="text-gray-300 underline">
          🔙 Back to Tools
        </Link>
      </div>
    </div>
  );
}
