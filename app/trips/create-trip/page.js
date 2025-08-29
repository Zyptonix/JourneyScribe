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

export default function CreateTripPage() {
    const [userId, setUserId] = useState(null);
    const [isPosting, setIsPosting] = useState(false);
    const router = useRouter();

    // Form State
    const [tripLocation, setTripLocation] = useState('');
    const [tripDuration, setTripDuration] = useState('');
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

    const handleImageChange = (e) => {
        if (e.target.files[0]) {
            setTripImage(e.target.files[0]);
            setImagePreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!tripLocation || !tripDuration || !tripImage || !userId) return;
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
                        <input type="text" placeholder="Trip Location (e.g., Paris, France)" value={tripLocation} onChange={(e) => setTripLocation(e.target.value)} required className="w-full p-3 rounded-lg bg-white/5 placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                        <input type="text" placeholder="Duration (e.g., 7 days, 2 weeks)" value={tripDuration} onChange={(e) => setTripDuration(e.target.value)} required className="w-full p-3 rounded-lg bg-white/5 placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                        <textarea placeholder="Trip Description (What's the plan?)" value={tripDescription} onChange={(e) => setTripDescription(e.target.value)} rows="4" className="w-full p-3 rounded-lg bg-white/5 placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-blue-400 resize-none" />
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
