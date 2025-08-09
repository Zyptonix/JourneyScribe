'use client';
import { useState, useRef } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, setDoc, getFirestore } from 'firebase/firestore'; // Import Firestore functions

// Initialize Firebase App and Firestore (assuming __firebase_config and __app_id are available)
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Reference to Firestore instance
let db;
try {
  const firebaseApp = require('firebase/app').getApps().length === 0 
    ? require('firebase/app').initializeApp(firebaseConfig) 
    : require('firebase/app').getApp();
  db = getFirestore(firebaseApp);
} catch (e) {
  console.error("Firebase initialization error:", e);
}


export default function SignupPage() {
  const [step, setStep] = useState(1); // Current step of the signup process
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    username: '',
    travelStyles: [],
    interests: [],
    budgetRange: '',
    dietaryRestrictions: [],
    // profilePictureUrl is removed from here
  });
  // base64Image and profileImagePreview states are removed

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Refs for scrolling to each section
  const step1Ref = useRef(null);
  const step2Ref = useRef(null);
  const step3Ref = useRef(null);

  const travelStyleOptions = ['Adventure', 'Relaxing', 'Cultural', 'Budget-friendly', 'Luxury', 'Family', 'Solo'];
  const interestOptions = ['Hiking', 'Beaches', 'Food & Culinary', 'Museums & History', 'Nightlife', 'Photography', 'Shopping', 'Nature', 'Sports'];
  const budgetRangeOptions = ['Under $500', '$500 - $1500', '$1500 - $5000', 'Over $5000'];
  const dietaryRestrictionsOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Dairy-Free', 'Nut Allergy'];


  // Function to handle input changes (file handling logic removed)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: checked
          ? [...prev[name], value]
          : prev[name].filter((item) => item !== value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Function to scroll to the next step
  const scrollToStep = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Handle proceeding to the next step
  const handleNextStep = async (e) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password should be at least 6 characters long.');
        return;
      }
      setStep(2);
      setTimeout(() => scrollToStep(step2Ref), 100); // Small delay for rendering
    } else if (step === 2) {
      if (!formData.fullName || !formData.username) {
        setError('Please fill in your Full Name and Username.');
        return;
      }
      setStep(3);
      setTimeout(() => scrollToStep(step3Ref), 100); // Small delay for rendering
    }
  };

  // Final signup submission (image upload logic removed)
  const handleFinalSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(''); // Clear errors at the start of submission

    try {
      // 1. Authenticate with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      const userId = user.uid;
      
      // profilePictureUrl is no longer needed here

      // 2. Save additional user data to Firestore
      if (db) {
        const userDocRef = doc(db, `userProfiles`, userId); 
        await setDoc(userDocRef, {
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email,
          travelStyles: formData.travelStyles,
          interests: formData.interests,
          budgetRange: formData.budgetRange,
          dietaryRestrictions: formData.dietaryRestrictions,
          // profilePictureUrl removed from Firestore document
          createdAt: new Date(),
        });
      } else {
        console.error("Firestore not initialized. Cannot save profile data.");
        setError("Could not save profile data. Please try again later.");
      }

      router.push('/'); // Redirect on successful signup and data save
    } catch (err) {
      console.error("Signup process error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 font-inter overflow-hidden">
      {/* Background Image with Blur Effect */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/assets/authBackground.jpg')", // Placeholder image
          filter: "blur(1px)",
          transform: "scale(1.05)"
        }}
        onError={(e) => { e.target.onerror = null; e.target.style.backgroundImage = "url('https://placehold.co/1920x1080/64748b/ffffff?text=Image+Error')"; }}
      ></div>

      {/* Overlay to darken and make content more readable */}
      <div className="absolute inset-0 bg-black opacity-10"></div>

      {/* Signup Card Container */}
      <div className="relative z-10 w-full max-w-lg mx-auto bg-white p-8 rounded-xl shadow-2xl transition-all duration-300 ease-in-out">
        {/* Step Indicator */}
        <div className="mb-6 text-center text-sm font-medium text-slate-600">
          Step {step} of 3
        </div>

        {/* Display error messages */}
        {error && (
          <p className="mb-4 rounded-md bg-red-100 p-3 text-sm font-medium text-red-700">
            Error: {error}
          </p>
        )}

        {/* Step 1: Account Creation */}
        <div ref={step1Ref} className={`transition-opacity duration-500 ${step === 1 ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
          <h2 className="mb-2 flex items-center justify-center gap-2 text-3xl font-bold text-slate-800">
            Create Your Account <span role="img" aria-label="sparkles">✨</span>
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            Join us and get started!
          </p>
          <form onSubmit={handleNextStep} className="space-y-6">
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
            <input
              type="password"
              name="password"
              placeholder="Password (min 6 characters)"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-green-600 p-3 font-semibold text-white transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={loading}
            >
              Next: Profile Info
            </button>
          </form>
        </div>

        {/* Step 2: Basic Profile Information */}
        <div ref={step2Ref} className={`transition-opacity duration-500 ${step === 2 ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
          <h2 className="mb-2 flex items-center justify-center gap-2 text-3xl font-bold text-slate-800">
            Tell Us About Yourself <span role="img" aria-label="waving hand">👋</span>
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            Help us personalize your JourneyScribe experience.
          </p>
          <form onSubmit={handleNextStep} className="space-y-6">
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              value={formData.fullName}
              onChange={handleChange}
              required
              disabled={loading}
            />
            <input
              type="text"
              name="username"
              placeholder="Username"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={loading}
            />
            {/* Profile Picture Input and Preview Removed */}
            <div className="flex justify-between space-x-4">
              <button
                type="button"
                onClick={() => { setStep(1); setTimeout(() => scrollToStep(step1Ref), 100); }}
                className="w-1/2 rounded-lg bg-slate-300 p-3 font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="w-1/2 rounded-lg bg-green-600 p-3 font-semibold text-white transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                Next: Preferences
              </button>
            </div>
          </form>
        </div>

        {/* Step 3: Personalization and Preferences */}
        <div ref={step3Ref} className={`transition-opacity duration-500 ${step === 3 ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
          <h2 className="mb-2 flex items-center justify-center gap-2 text-3xl font-bold text-slate-800">
            Your Travel Preferences <span role="img" aria-label="globe">🌍</span>
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            Tell us how you like to travel for tailored recommendations.
          </p>
          <form onSubmit={handleFinalSignup} className="space-y-6">
            {/* Travel Style */}
            <div>
              <label className="block text-left text-sm font-medium text-slate-700 mb-2">Preferred Travel Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {travelStyleOptions.map((style) => (
                  <label key={style} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors duration-200">
                    <input
                      type="checkbox"
                      name="travelStyles"
                      value={style}
                      checked={formData.travelStyles.includes(style)}
                      onChange={handleChange}
                      className="form-checkbox text-blue-600 rounded"
                      disabled={loading}
                    />
                    <span className="text-sm text-slate-700">{style}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-left text-sm font-medium text-slate-700 mb-2">Interests</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {interestOptions.map((interest) => (
                  <label key={interest} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-purple-50 transition-colors duration-200">
                    <input
                      type="checkbox"
                      name="interests"
                      value={interest}
                      checked={formData.interests.includes(interest)}
                      onChange={handleChange}
                      className="form-checkbox text-purple-600 rounded"
                      disabled={loading}
                    />
                    <span className="text-sm text-slate-700">{interest}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Budget Range */}
            <div>
              <label className="block text-left text-sm font-medium text-slate-700 mb-2">Budget Range</label>
              <select
                name="budgetRange"
                value={formData.budgetRange}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 outline-none transition-colors duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                required
                disabled={loading}
              >
                <option value="">Select your budget</option>
                {budgetRangeOptions.map((budget) => (
                  <option key={budget} value={budget}>{budget}</option>
                ))}
              </select>
            </div>

            {/* Dietary Restrictions */}
            <div>
              <label className="block text-left text-sm font-medium text-slate-700 mb-2">Dietary Restrictions (Optional)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dietaryRestrictionsOptions.map((restriction) => (
                  <label key={restriction} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 transition-colors duration-200">
                    <input
                      type="checkbox"
                      name="dietaryRestrictions"
                      value={restriction}
                      checked={formData.dietaryRestrictions.includes(restriction)}
                      onChange={handleChange}
                      className="form-checkbox text-emerald-600 rounded"
                      disabled={loading}
                    />
                    <span className="text-sm text-slate-700">{restriction}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between space-x-4">
              <button
                type="button"
                onClick={() => { setStep(2); setTimeout(() => scrollToStep(step2Ref), 100); }}
                className="w-1/2 rounded-lg bg-slate-300 p-3 font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="w-1/2 rounded-lg bg-blue-600 p-3 font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div >

        <p className="mt-6 text-sm text-slate-500 text-center">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div >
    </div >
  );
}
