"use client";
import { useState } from "react";
import Link from "next/link";

export default function CurrencyPage() {
  const [amount, setAmount] = useState(1);
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [result, setResult] = useState(null);

  const convertCurrency = async () => {
    const res = await fetch(
      `/api/convert-currency?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`
    );
    const json = await res.json();
    if (json.success) setResult(json);
  };

  return (
    <div 
       className="min-h-screen w-full bg-center bg-cover flex items-center justify-center p-6" 
       style={{ backgroundImage: "url('/assets/plainn.jpg')" }}
    >
      <div className="backdrop-blur-xl bg-white/20 rounded-2xl shadow-2xl border border-white/30 p-8 w-full max-w-lg">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
          💱 Currency Converter
        </h2>

        {/* Input Row */}
        <div className="flex gap-3 mb-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 p-3 rounded-xl bg-white/30 text-black placeholder-gray-700 focus:outline-none"
          />
          <select
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value)}
            className="w-28 p-3 rounded-xl bg-white/30 text-black focus:outline-none"
          >
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
            <option>BDT</option>
            <option>INR</option>
            <option>JPY</option>
          </select>
        </div>

        {/* To Row */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={result ? result.convertedAmount : ""}
            disabled
            className="flex-1 p-3 rounded-xl bg-white/20 text-white placeholder-gray-300 focus:outline-none"
            placeholder="Result"
          />
          <select
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value)}
            className="w-28 p-3 rounded-xl bg-white/30 text-black focus:outline-none"
          >
            <option>EUR</option>
            <option>USD</option>
            <option>GBP</option>
            <option>BDT</option>
            <option>INR</option>
            <option>JPY</option>
          </select>
        </div>

        <button
          onClick={convertCurrency}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-blue-500 text-white font-semibold hover:opacity-90 shadow-lg"
        >
          Convert
        </button>

        {result && (
          <div className="mt-6 text-white text-lg">
            <p>
              {amount} {fromCurrency} ={" "}
              <span className="font-bold">{result.convertedAmount}</span>{" "}
              {toCurrency}
            </p>
            <p className="text-sm opacity-80">Rate: {result.rate}</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="text-center mt-6">
        <Link href="/travel-tools/time" className="text-blue-300 underline">
          ➡️ Go to Time Converter
        </Link>
        <br />
        <Link href="/travel-tools" className="text-gray-300 underline">
          🔙 Back to Tools
        </Link>
      </div>
    </div>
  );
}
