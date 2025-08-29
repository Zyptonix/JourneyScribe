'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebaseClient.js';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// --- Global variables ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Main Trip Posts Page Component ---
const TripPostsPage = () => {
    const [userId, setUserId] = useState(null);
    const [allTripPosts, setAllTripPosts] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const router = useRouter();

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

    useEffect(() => {
        if (!userId) return;
        const postsCollection = collection(db, `artifacts/${appId}/public/data/trips`);
        const q = query(postsCollection, orderBy("createdAt", "desc"));
        const unsubscribePosts = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllTripPosts(postsData);
        });
        return () => unsubscribePosts();
    }, [userId]);

    const filteredPosts = allTripPosts.filter(post => {
        if (activeTab === 'mine') return post.userId === userId;
        if (activeTab === 'joined') return post.accepted?.includes(userId) && post.userId !== userId;
        return true;
    });

    return (
        <Suspense>
            <div className="fixed inset-0 -z-10 h-full w-full bg-cover bg-center" style={{ backgroundImage: "url('/assets/traveldocs.png')" }} />
            <div className="fixed inset-x-0 top-0 h-[100vh] bg-gradient-to-b from-black to-blue-800 opacity-40" />

            <div className="min-h-screen font-inter flex flex-col pt-20 relative z-10 text-white">
                <div className="container mx-auto p-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-center text-white mb-2">Shared Trip Posts</h1>
                    <p className="text-center text-white/80 mb-8">Share your travel plans and find companions for your next journey.</p>
                    
                    <div className="text-center mb-8">
                        <Link href="/trips/create-trip" className="px-8 py-3 rounded-full text-lg font-semibold transition-all bg-blue-600 text-white shadow-lg hover:bg-blue-700">
                            + Create a New Trip
                        </Link>
                    </div>

                    <div className="flex justify-center mb-6 gap-4">
                        <button onClick={() => setActiveTab('all')} className={`px-6 py-2 rounded-full font-semibold transition-all ${activeTab === 'all' ? 'bg-blue-600' : 'bg-black/30'}`}>All Trips</button>
                        <button onClick={() => setActiveTab('mine')} className={`px-6 py-2 rounded-full font-semibold transition-all ${activeTab === 'mine' ? 'bg-blue-600' : 'bg-black/30'}`}>My Trips</button>
                        <button onClick={() => setActiveTab('joined')} className={`px-6 py-2 rounded-full font-semibold transition-all ${activeTab === 'joined' ? 'bg-blue-600' : 'bg-black/30'}`}>Joined Trips</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPosts.length > 0 ? (
                            filteredPosts.map((post) => (
                                <Link key={post.id} href={`/trips/${post.id}`} className="block p-6 rounded-2xl shadow-xl bg-black/30 backdrop-blur-xl border border-white/30 overflow-hidden transition-transform hover:scale-105 hover:border-blue-400">
                                    <img src={post.imageUrl} alt={`Trip to ${post.location}`} className="w-full h-48 object-cover rounded-lg mb-4" />
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-xl font-bold text-white">{post.location}</p>
                                            <p className="text-sm text-white/80">{post.duration}</p>
                                        </div>
                                        <span className="text-xs bg-white/10 text-white px-2 py-1 rounded-full">By: {post.username}</span>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
                                        <span className="text-sm text-white/70">{post.accepted?.length || 0} / {post.maxMembers} Members</span>
                                        <span className="text-sm font-semibold text-blue-400">View Details →</span>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center text-white/60 py-16 p-6 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/30 md:col-span-2 lg:col-span-3">
                                <p>No trips found in this category.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Suspense>
    );
};

export default TripPostsPage;
