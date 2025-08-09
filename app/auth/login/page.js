'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
// Assuming '@/lib/firebase' correctly exports the Firebase auth instance
import { auth } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation'; // Correct import for useRouter
import Link from 'next/link'; // Import Link for better Next.js navigation

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading to true on submission
    setError('');     // Clear previous errors

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/'); // Redirect on successful login
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); // Set loading to false after completion (success or error)
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 font-inter overflow-hidden">
      {/* Background Image with Blur Effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center" 
        style={{ 
          // Changed to local image path with explicit .jpg extension
          backgroundImage: "url('/assets/authBackground.jpg')", // <--- Check and update this extension if needed!
          filter: "blur(1px)", 
          transform: "scale(1.05)" 
        }}
      ></div>
      
      {/* Overlay to darken and make content more readable over the blurred background */}
      <div className="absolute inset-0 bg-black opacity-10"></div>

      {/* Login Card - relative positioning to be on top of background */}
      <div className="relative z-10 w-full max-w-md transform rounded-xl bg-white p-8 text-center shadow-2xl transition-all duration-300 ease-in-out hover:scale-105">
        <h2 className="mb-2 flex items-center justify-center gap-2 text-3xl font-bold text-slate-800">
          Welcome to JourneyScribe <span role="img" aria-label="airplane">✈️</span>
        </h2>
        <p className="mb-6 text-sm text-slate-500">
          Your adventure begins here.
        </p>

        {/* Display error messages */}
        {error && (
          <p className="mb-4 rounded-md bg-red-100 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="email"
            placeholder="Email Address"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required // Make the email field required
            disabled={loading} // Disable input while loading
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required // Make the password field required
            disabled={loading} // Disable input while loading
          />

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={loading} // Disable button while loading
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
          <Link href="/auth/forgot-password" className="font-semibold text-blue-600 hover:underline">
            Forgot password?
          </Link>
          <Link href="/auth/signup" className="font-semibold text-blue-600 hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
