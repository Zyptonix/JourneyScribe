'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// A simple debounce function to prevent excessive API calls
const debounce = (func, delay) => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
};

export default function CitySearchLight({ value, onQueryChange, placeholder, onCitySelect, required }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const suggestionsRef = useRef(null);

  const fetchSuggestions = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`/api/city-search?keyword=${searchQuery}`);
        const data = await response.json();
        if (response.ok) {
          setSuggestions(data);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    const isFormattedSelection = value && value.includes('(') && value.includes(')');
    if (value && !isFormattedSelection) {
      fetchSuggestions(value);
    } else {
      setSuggestions([]);
    }
  }, [value, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city) => {
    onQueryChange(`${city.name} (${city.iataCode})`);
    onCitySelect(city.iataCode);
    setSuggestions([]);
  };

  return (
    <div className="relative w-full" ref={suggestionsRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onQueryChange(e.target.value)}
        // --- LIGHT THEME STYLES ---
        className="w-full p-3 bg-white text-black placeholder-slate-400 border border-slate-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
        required={required}
      />
      {isLoading && <div className="absolute right-3 top-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"></div>}

      {suggestions.length > 0 && (
        // --- LIGHT THEME STYLES ---
        <ul className="absolute z-10 w-full bg-white border border-slate-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
          {suggestions.map((city, index) => (
            <li
              key={`${city.iataCode}-${index}`}
              onClick={() => handleSelect(city)}
              // --- LIGHT THEME STYLES ---
              className="p-3 hover:bg-cyan-50 cursor-pointer text-slate-800"
            >
              {city.name} <span className="text-slate-500">({city.iataCode})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
