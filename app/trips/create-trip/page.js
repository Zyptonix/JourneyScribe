'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebaseClient.js';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { doc, addDoc, collection, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import NavigationBarDark from '@/components/NavigationBarDark';

// --- Global variables ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Helper Function to Calculate Durati  on ---
const calculateDurationInDays = (start, end) => {
    if (!start || !end) return '';
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
        return 'Invalid dates';
    }
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
};


export default function CreateTripPage() {
    const [userId, setUserId] = useState(null);
    const [isPosting, setIsPosting] = useState(false);
    const router = useRouter();
    const [currency, setCurrency] = useState('BDT'); 
    // List of common currencies
    const currencyOptions = ['BDT', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
    // Form State
    const [tripLocation, setTripLocation] = useState('');
    const [tripDuration, setTripDuration] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [cost, setCost] = useState('');
    const [tripDescription, setTripDescription] = useState('');
    const [maxMembers, setMaxMembers] = useState(10);
    const [tripImage, setTripImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else if (initialAuthToken) {
                try {
                    const userCredential = await signInWithCustomToken(auth, initialAuthToken);
                    setUserId(userCredential.user.uid);
                } catch (error) { console.error('Error signing in:', error); }
            } else {
                signInAnonymously(auth);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // Automatically calculate duration when dates change
    useEffect(() => {
        if (startDate && endDate) {
            setTripDuration(calculateDurationInDays(startDate, endDate));
        }
    }, [startDate, endDate]);

    const handleImageChange = (e) => {
        if (e.target.files[0]) {
            setTripImage(e.target.files[0]);
            setImagePreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!tripLocation || !startDate || !endDate || !tripImage || !userId) {
            alert("Please fill in all required fields.");
            return;
        }
        setIsPosting(true);
        try {
            const imgbbApiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
            if (!imgbbApiKey) throw new Error("ImgBB API key is not configured.");
            
            const formData = new FormData();
            formData.append('image', tripImage);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, { method: 'POST', body: formData });
            const data = await response.json();
            if (!data.success) throw new Error(data.error.message || "Failed to upload image.");

            const userProfileRef = doc(db, 'userProfiles', userId);
            const userDocSnap = await getDoc(userProfileRef);
            const username = userDocSnap.exists() ? userDocSnap.data().fullName || 'Anonymous' : 'Anonymous';

            const newPost = {
                userId,
                username,
                location: tripLocation,
                duration: tripDuration,
                startDate,
                endDate,
                cost: parseFloat(cost) || 0,
                currency, // <-- Added this line
                description: tripDescription,
                maxMembers: Number(maxMembers),
                imageUrl: data.data.url,
                requests: [],
                accepted: [userId],
                createdAt: Date.now(),
            };

            const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/trips`), newPost);
            
            alert('Trip post created successfully!');
            router.push(`/trips/${docRef.id}`); // Navigate to the new trip's detail page

        } catch (error) {
            console.error('Error creating trip post:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-cover bg-center font-inter text-white" style={{ backgroundImage: "url('/assets/traveldocs.png')" }}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <NavigationBarDark />
            <div className="relative z-10 container mx-auto px-4 py-24">
                <div className="max-w-2xl mx-auto bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                    <h1 className="text-4xl font-extrabold text-center mb-2">Create a New Trip Post</h1>
                    <p className="text-center text-white/80 mb-8">Share the details of your upcoming journey to find travel companions.</p>
                    
                    <form onSubmit={handleCreatePost} className="space-y-6">
                        <input type="text" placeholder="Trip Location (e.g., Paris, France)" value={tripLocation} onChange={(e) => setTripLocation(e.target.value)} required className="w-full p-3 rounded-lg bg-black/70  placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">Start Date</label>
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full p-3 rounded-lg bg-black/70  border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">End Date</label>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full p-3 rounded-lg bg-black/70  border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                                </div>
                            </div>
                        <input type="text" placeholder="Duration (auto-calculated)" value={tripDuration} readOnly className="w-full p-3 rounded-lg bg-black/70 text-white/70 placeholder-white/50 border-2 border-white/30 focus:outline-none" />
                        <textarea placeholder="Trip Description (What's the plan?)" value={tripDescription} onChange={(e) => setTripDescription(e.target.value)} rows="4" className="w-full p-3 rounded-lg bg-black/70  placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-blue-400 resize-none" />
                           {/* New currency and cost input group */}
                        <div className="flex items-center space-x-2">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-white/80 mb-2">Estimated Cost</label>
                                <input type="number" placeholder="Cost" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full p-3 rounded-lg bg-black/70  placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">Currency</label>
                                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full p-3 rounded-lg bg-black/70 border-2 border-white/30 focus:outline-none focus:border-blue-400">
                                    {currencyOptions.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Max Group Size: {maxMembers}</label>
                            <input type="range" min="2" max="20" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Cover Image</label>
                            <input type="file" id="image-upload-input" accept="image/*" onChange={handleImageChange} required className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600" />
                            {imagePreview && <img src={imagePreview} alt="Preview" className="mt-4 w-full h-48 object-cover rounded-lg" />}
                        </div>
                        <button type="submit" className="w-full bg-blue-600 font-bold py-3 px-6 rounded-lg hover:bg-blue-700 shadow-md disabled:bg-gray-500 transition-all transform hover:scale-105" disabled={isPosting}>
                            {isPosting ? 'Creating Post...' : 'Create Post'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
