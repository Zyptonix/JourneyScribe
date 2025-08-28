"use client";
import Link from "next/link";

export default function TravelTools() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-6">
      <div className="backdrop-blur-xl bg-white/20 rounded-2xl shadow-2xl border border-white/30 p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-white mb-6">🌍 Travel Tools</h1>
        <p className="text-white/80 mb-8">
          Convert currency and local time to make better travel decisions.
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/travel-tools/currency"
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-blue-500 text-white font-semibold shadow-md hover:opacity-90"
          >
            💱 Currency Converter
          </Link>

          <Link
            href="/travel-tools/time"
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-md hover:opacity-90"
          >
            ⏰ Time Converter
          </Link>
        </div>
      </div>
    </div>
  );
}
