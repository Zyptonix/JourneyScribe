'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import NavigationBarLight from '@/components/NavigationBarLight';

// Component for displaying user preferences as tags
const InfoTag = ({ children }) => (
    <span className="bg-white/10 text-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full border border-white/20">
        {children}
    </span>
);

export default function UserProfilePage() {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const router = useRouter(); // For the "Go Back" button
    const params = useParams(); // To get the dynamic route parameter
    const { userid } = params;

    useEffect(() => {
        if (userid) {
            fetchUserProfile(userid);
        } else {
            setError("User ID not found in URL.");
            setLoading(false);
        }
    }, [userid]); // Re-run effect when the userid changes

    const fetchUserProfile = async (uid) => {
        setLoading(true);
        setError(null);
        try {
            const userProfileRef = doc(db, 'userProfiles', uid);
            const docSnap = await getDoc(userProfileRef);

            if (docSnap.exists()) {
                setProfileData(docSnap.data());
            } else {
                setError("User profile not found.");
                setProfileData(null);
            }
        } catch (err) {
            console.error('Error fetching user profile:', err);
            setError('Failed to load user profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    // Helper component for loading and error states
    const renderStatusMessage = (message) => (
        <div className="min-h-screen font-inter flex flex-col items-center justify-center pt-20 relative z-10 p-4">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl text-center">
                <p className="text-xl text-white">{message}</p>
                 <button 
                    onClick={() => router.back()} 
                    className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        </div>
    );

    if (loading) {
        return renderStatusMessage("Loading Profile...");
    }
    
    if (error) {
        return renderStatusMessage(error);
    }
    
    if (!profileData) {
        return renderStatusMessage("No profile data available.");
    }

    return (
        <>
            <div className="fixed inset-0 blur -z-10 h-full w-full bg-cover bg-center" style={{ backgroundImage: "url('/assets/profilepage.jpg')" }}></div>
            <div className="fixed inset-x-0 top-0 h-full bg-gradient-to-b from-white-300 to-blue-900 opacity-60 -z-10"></div>
            <div className="fixed top-0 w-full z-50"><NavigationBarLight /></div>

            <div className="min-h-screen font-inter flex flex-col items-center justify-center pt-28 pb-12 px-4 relative z-10">
                <div className="w-full max-w-4xl">
                    <div className="bg-black/50 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
                        <h1 className="text-3xl font-bold text-center text-white mb-2">JourneyScribe User Profile</h1>
                        <p className="text-center text-white/70 mb-8">Personalized travel preferences and information.</p>

                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-shrink-0 text-center">
                                <img
                                    src={profileData?.profilePicture || "https://placehold.co/150x150/1F2937/FFFFFF?text=User"}
                                    alt="Profile"
                                    className="w-36 h-36 rounded-full object-cover border-4 border-white/30 shadow-xl mx-auto"
                                    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/150x150/1F2937/FFFFFF?text=User"; }}
                                />
                                <button 
                                    onClick={() => router.back()} 
                                    className="mt-6 w-full px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors"
                                >
                                    Go Back
                                </button>
                            </div>
                            
                            <div className="w-full border-t-2 md:border-t-0 md:border-l-2 border-white/20 pt-6 md:pt-0 md:pl-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                    <div>
                                        <label className="text-sm text-white/60">Full Name</label>
                                        <p className="text-lg font-semibold text-white">{profileData?.fullName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-white/60">Username</label>
                                        <p className="text-lg font-semibold text-white">{profileData?.username || 'N/A'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-sm text-white/60">Email</label>
                                        <p className="text-lg font-semibold text-white">{profileData?.email || 'N/A'}</p>
                                    </div>
                                </div>
                                
                                <hr className="border-white/20 my-6" />

                                <div>
                                    <h3 className="text-md font-semibold text-white mb-3">Travel Preferences</h3>
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <strong className="text-sm text-white/80 w-28">Styles:</strong>
                                            {profileData?.travelStyles?.length > 0 ? profileData.travelStyles.map(s => <InfoTag key={s}>{s}</InfoTag>) : <InfoTag>Not set</InfoTag>}
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <strong className="text-sm text-white/80 w-28">Interests:</strong>
                                            {profileData?.interests?.length > 0 ? profileData.interests.map(i => <InfoTag key={i}>{i}</InfoTag>) : <InfoTag>Not set</InfoTag>}
                                        </div>
                                         <div className="flex flex-wrap gap-2 items-center">
                                            <strong className="text-sm text-white/80 w-28">Budget:</strong>
                                            {profileData?.budgetRange ? <InfoTag>{profileData.budgetRange}</InfoTag> : <InfoTag>Not set</InfoTag>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}