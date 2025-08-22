'use client';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import NavigationBarDark from '@/components/NavigationBarDark';

export default function UserProfilePage() {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Get the user ID from the URL parameters
    const { userid } = useParams();
    const router = useRouter();

    useEffect(() => {
        if (!userid) {
            setLoading(false);
            setError("User ID is missing from the URL.");
            return;
        }

        const fetchUserProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const userProfileRef = doc(db, 'userProfiles', userid);
                const docSnap = await getDoc(userProfileRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfileData(data);
                } else {
                    setProfileData(null);
                    setError("User profile not found.");
                }
            } catch (err) {
                console.error('Error fetching user profile:', err);
                setError('Failed to load user profile. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [userid]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
                <p className="text-xl">Loading profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 text-white">
                <p className="text-xl text-red-400 mb-4">Error: {error}</p>
                <button 
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full hover:scale-105 transition-transform"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 text-white">
                <p className="text-xl text-white mb-4">Profile not found for this user.</p>
                <button 
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full hover:scale-105 transition-transform"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            <div className="fixed top-0 w-full z-50"><NavigationBarDark /></div>
            <div className="pt-20 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="relative p-6 sm:p-8 w-full max-w-2xl mt-18 rounded-3xl backdrop-blur-md bg-white/10 border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] animate-fade-in">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#e02f75] to-[#ff5a57]">
                        {profileData.fullName || profileData.username || 'User Profile'}
                    </h1>
                    <div className="flex flex-col items-center mb-6">
                        <img
                            src={profileData.profilePicture || "https://placehold.co/100x100/1F2937/FFFFFF?text=User"}
                            alt="Profile"
                            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white/50 shadow-xl mb-3 transform transition-transform"
                        />
                        <p className="text-xl font-semibold text-white">
                            {profileData.fullName || profileData.username || 'N/A'}
                        </p>
                    </div>
                    
                    <div className="space-y-4 text-gray-300">
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#ff5a57] to-transparent my-6"></div>
                        <p><span className="font-semibold text-white">Username:</span> {profileData.username || 'N/A'}</p>
                        <p><span className="font-semibold text-white">Full Name:</span> {profileData.fullName || 'N/A'}</p>
                        <p><span className="font-semibold text-white">Travel Styles:</span> {Array.isArray(profileData.travelStyles) && profileData.travelStyles.length > 0 ? profileData.travelStyles.join(', ') : 'N/A'}</p>
                        <p><span className="font-semibold text-white">Interests:</span> {Array.isArray(profileData.interests) && profileData.interests.length > 0 ? profileData.interests.join(', ') : 'N/A'}</p>
                        <p><span className="font-semibold text-white">Budget Range:</span> {profileData.budgetRange || 'N/A'}</p>
                        <p><span className="font-semibold text-white">Dietary Restrictions:</span> {Array.isArray(profileData.dietaryRestrictions) && profileData.dietaryRestrictions.length > 0 ? profileData.dietaryRestrictions.join(', ') : 'N/A'}</p>
                        <p>
                            <span className="font-semibold text-white">Member Since:</span>{" "}
                            {profileData.createdAt
                                ? profileData.createdAt.toDate
                                    ? profileData.createdAt.toDate().toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric"
                                    })
                                    : new Date(profileData.createdAt._seconds * 1000).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric"
                                    })
                                : "N/A"}
                        </p>
                    </div>
                    <div className="text-center mt-6">
                        <button 
                            onClick={() => router.back()}
                            className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-full group bg-gradient-to-br from-[#6700a3] to-[#ff5a57] group-hover:from-[#6700a3] group-hover:to-[#ff5a57] hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                        >
                            <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-full group-hover:bg-opacity-0">
                                Go Back
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}