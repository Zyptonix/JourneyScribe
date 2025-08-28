"use client";
import { useState } from "react";

export default function FeedbackPage() {
  const [location, setLocation] = useState("");
  const [username, setUsername] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Submit Feedback
  const submitFeedback = async () => {
    if (!location || !username || !comment) {
      setMessage("⚠️ Please fill all fields before submitting.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, username, rating, comment }),
    });

    const data = await res.json();
    setMessage(data.message);

    if (data.success) {
      setLocation("");
      setUsername("");
      setRating(5);
      setComment("");
      fetchFeedbacks();
    }
    setLoading(false);
  };

  // Fetch Feedbacks for a location
  const fetchFeedbacks = async () => {
    if (!location) {
      setMessage("⚠️ Please enter a location to fetch reviews.");
      return;
    }

    const res = await fetch(`/api/feedback?location=${location}`);
    const data = await res.json();
    if (data.success) setReviews(data.reviews);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-6">
      {/* Background Image for the top 80% of the viewport, now FIXED */}
      <div
        className="fixed inset-x-0 top-0 h-[100vh] bg-cover bg-center" // Changed to fixed position
        style={{
          backgroundImage: "url('/assets/Feedback.avif')", // Placeholder image
          filter: "blur(2px)", // Re-add blur if desired, removed as per previous update
          transform: "scale(1.05)" // Slightly scale to avoid blurry edges
        }}
      ></div>
            <div className="fixed inset-x-0 top-0 h-[100vh] bg-black opacity-20 "></div>
      <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-white/30">
        <h2 className="text-2xl font-bold text-white mb-6">🌍 Trip Feedback</h2>

        {/* Location */}
        <input
          type="text"
          placeholder="Enter Location (e.g. Paris)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full p-3 rounded-xl mb-4 bg-white/30 text-black"
        />

        {/* Username */}
        <input
          type="text"
          placeholder="Your Name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 rounded-xl mb-4 bg-white/30 text-black"
        />

        {/* Rating */}
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full p-3 rounded-xl mb-4 bg-white/30 text-black"
        >
          <option value={5}>⭐️⭐️⭐️⭐️⭐️ (5)</option>
          <option value={4}>⭐️⭐️⭐️⭐️ (4)</option>
          <option value={3}>⭐️⭐️⭐️ (3)</option>
          <option value={2}>⭐️⭐️ (2)</option>
          <option value={1}>⭐️ (1)</option>
        </select>

        {/* Comment */}
        <textarea
          placeholder="Write your feedback..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-3 rounded-xl mb-4 bg-white/30 text-black"
        />

        {/* Submit */}
        <button
          onClick={submitFeedback}
          disabled={loading}
          className={`w-full py-3 text-white font-semibold rounded-xl shadow-lg transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90"
          }`}
        >
          {loading ? "Submitting..." : "Submit Feedback"}
        </button>

        {message && <p className="text-white mt-2">{message}</p>}

        {/* Reviews Section */}
        <button
          onClick={fetchFeedbacks}
          className="w-full mt-4 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:opacity-90"
        >
          Show Feedbacks for {location || "a location"}
        </button>

        {reviews.length > 0 && (
          <div className="mt-6 text-white">
            <h3 className="text-lg font-bold">Feedbacks for {location}:</h3>
            <ul className="mt-2 space-y-2">
              {reviews.map((r) => (
                <li key={r.id} className="bg-white/20 p-3 rounded-xl">
                  <p className="font-semibold">{r.username} ({r.rating}⭐)</p>
                  <p>{r.comment}</p>
                  <small className="opacity-70">
                    {new Date(r.createdAt).toLocaleString()}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
