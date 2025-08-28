'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function DestinationDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const name = searchParams.get('name');
  const type = searchParams.get('type');
  const locationId = searchParams.get('locationId');
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');
  const iataCode = searchParams.get('iataCode'); // For cities

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attractions, setAttractions] = useState([]);

  useEffect(() => {
    const fetchAttractions = async () => {
      setLoading(true);
      setError('');
      setAttractions([]);

      if (!locationId && (!latitude || !longitude)) {
        setError("Missing location details to fetch attractions. Please go back to search.");
        setLoading(false);
        return;
      }

      try {
        const queryParams = new URLSearchParams();
        if (locationId) {
          queryParams.set('locationId', locationId);
        } else {
          queryParams.set('latitude', latitude);
          queryParams.set('longitude', longitude);
        }

        const response = await fetch(`/api/attractions?${queryParams.toString()}`);
        const data = await response.json();

        if (response.ok && Array.isArray(data)) {
          setAttractions(data);
          if (data.length === 0) {
            setError(`No attractions found for ${name}. Try a different search.`);
          }
        } else {
          setError(data.error || 'Failed to fetch attractions.');
        }
      } catch (err) {
        console.error("Attractions API error:", err);
        setError(`Network error fetching attractions: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAttractions();
  }, [locationId, latitude, longitude, name]); // Re-fetch when these params change

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-teal-50 to-blue-50 font-inter">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-3xl font-bold text-center text-slate-800 mb-6">
          Attractions for {name} ({type}) 📍
        </h1>

        {error && (
          <p className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">{error}</p>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-slate-700">Loading attractions...</p>
          </div>
        )}

        {!loading && attractions.length > 0 ? (
          <div className="space-y-6 mt-8">
            {attractions.map((attraction) => (
              <div key={attraction.id} className="p-5 border border-slate-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold text-blue-700 mb-2">{attraction.name}</h2>
                <p className="text-slate-600 mb-2 text-sm">Category: {attraction.category}</p>
                {attraction.description && (
                  <p className="text-slate-700 text-sm mb-3">{attraction.description}</p>
                )}
                {attraction.tags && attraction.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attraction.tags.map((tag, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
                {attraction.latitude && attraction.longitude && (
                  <p className="text-sm text-slate-500">
                    Coordinates: {attraction.latitude}, {attraction.longitude}
                  </p>
                  // Here you would integrate Google Maps to show the location
                )}
              </div>
            ))}
          </div>
        ) : (
          !loading && <p className="text-center text-slate-500 mt-8">No attractions found for this destination.</p>
        )}
         <div className="mt-8 text-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
