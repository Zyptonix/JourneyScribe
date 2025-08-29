'use client';

import React, { Suspense, useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebaseClient.js';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc, collection, query, where } from 'firebase/firestore';
import NavigationBarDark from '@/components/NavigationBarDark';

// --- Helper Components ---
const UserAvatar = ({ userId }) => {
    const [user, setUser] = useState(null);
    useEffect(() => {
        const fetchUser = async () => {
            if (!userId) return;
            const userDoc = await getDoc(doc(db, 'userProfiles', userId));
            if (userDoc.exists()) {
                setUser(userDoc.data());
            } else {
                setUser({ fullName: 'Unknown User' });
            }
        };
        fetchUser();
    }, [userId]);

    if (!user) {
        return <div className="animate-pulse flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-gray-700"></div><div className="h-4 bg-gray-700 rounded w-24"></div></div>;
    }

    return (
        <div className="flex items-center gap-2 bg-black/20 p-2 rounded-full">
            <img src={user.profilePicture || `https://placehold.co/32x32/1a1a1a/ffffff?text=${user.fullName?.[0] || '?'}`} alt={user.fullName} className="w-8 h-8 rounded-full object-cover" />
            <span className="font-semibold text-white pr-2">{user.fullName || 'Anonymous'}</span>
        </div>
    );
};


// --- Global variables ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

export default function TripDetailsPage({ params }) {
    const [userId, setUserId] = useState(null);
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [requestingUsersData, setRequestingUsersData] = useState([]); // For optimized modal
    const [myBlogs, setMyBlogs] = useState([]);
    const [selectedBlogId, setSelectedBlogId] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ location: '', duration: '', description: '', cost: '' });

    const router = useRouter();
    const { tripId } = use(params);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                // Fetch user's blogs for the linking feature
                const blogsQuery = query(collection(db, 'blogs'), where("authorId", "==", user.uid));
                onSnapshot(blogsQuery, (snapshot) => {
                    setMyBlogs(snapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title })));
                });
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
        if (!tripId) return;
        const postRef = doc(db, `artifacts/${appId}/public/data/trips`, tripId);
        const unsubscribe = onSnapshot(postRef, (doc) => {
            if (doc.exists()) {
                const tripData = { id: doc.id, ...doc.data() };
                setTrip(tripData);
                setEditForm({
                    location: tripData.location,
                    duration: tripData.duration,
                    description: tripData.description || '',
                    cost: tripData.cost || ''
                });
            } else {
                console.error("Trip not found!");
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [tripId]);
    
    const fetchRequestingUsers = async () => {
        if (!trip || trip.requests.length === 0) {
            setRequestingUsersData([]);
            return;
        }
        const userPromises = trip.requests.map(id => getDoc(doc(db, 'userProfiles', id)));
        const userDocs = await Promise.all(userPromises);
        setRequestingUsersData(userDocs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const handleRequestAction = async (requestUserId, action) => {
        const postRef = doc(db, `artifacts/${appId}/public/data/trips`, tripId);
        try {
            if (action === 'accept') {
                await updateDoc(postRef, { requests: arrayRemove(requestUserId), accepted: arrayUnion(requestUserId) });
            } else {
                await updateDoc(postRef, { requests: arrayRemove(requestUserId) });
            }
        } catch (error) { console.error(`Error ${action}ing request:`, error); }
    };
    
    const handleRequestToJoin = async () => {
        if (!userId) return;
        const postRef = doc(db, `artifacts/${appId}/public/data/trips`, tripId);
        await updateDoc(postRef, { requests: arrayUnion(userId) });
    };

    const handleGoToChat = () => {
        localStorage.setItem('selectedTripId', tripId);
        router.push('/chat'); 
    };

    const handleUpdateTrip = async (e) => {
        e.preventDefault();
        const postRef = doc(db, `artifacts/${appId}/public/data/trips`, tripId);
        try {
            await updateDoc(postRef, {
                ...editForm,
                cost: parseFloat(editForm.cost) || 0
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating trip:", error);
        }
    };

    const handleLinkBlog = async () => {
        if (!selectedBlogId) return;
        const postRef = doc(db, `artifacts/${appId}/public/data/trips`, tripId);
        await updateDoc(postRef, { linkedBlogId: selectedBlogId });
        setSelectedBlogId('');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading Trip...</div>;
    if (!trip) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Trip not found.</div>;

    const isOwner = userId === trip.userId;
    const isMember = trip.accepted?.includes(userId);
    const hasRequested = trip.requests?.includes(userId);

    return (
        <Suspense>
            <div className="min-h-screen font-inter text-white">
                <div className="fixed inset-0 -z-10 h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${trip.imageUrl})` }} />
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md -z-10" />
                <NavigationBarDark />
                <div className="relative z-10 container mx-auto p-4 pt-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                            {isEditing ? (
                                <form onSubmit={handleUpdateTrip} className="space-y-4">
                                    <input type="text" value={editForm.location} onChange={(e) => setEditForm({...editForm, location: e.target.value})} className="w-full p-3 text-4xl font-extrabold bg-white/10 rounded-lg border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                                    <input type="text" value={editForm.duration} onChange={(e) => setEditForm({...editForm, duration: e.target.value})} className="w-full p-2 text-lg bg-white/10 rounded-lg border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                                    <textarea value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} rows="5" className="w-full p-2 bg-white/10 rounded-lg border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                                    <input type="number" value={editForm.cost} onChange={(e) => setEditForm({...editForm, cost: e.target.value})} placeholder="Trip Cost (USD)" className="w-full p-2 bg-white/10 rounded-lg border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                                    <div className="flex gap-4">
                                        <button type="submit" className="flex-1 p-3 bg-green-600 rounded-lg hover:bg-green-700">Save Changes</button>
                                        <button type="button" onClick={() => setIsEditing(false)} className="flex-1 p-3 bg-gray-600 rounded-lg hover:bg-gray-700">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h1 className="text-4xl md:text-5xl font-extrabold mb-2">{trip.location}</h1>
                                            <p className="text-lg text-white/80 mb-4">{trip.duration}</p>
                                            <p className="text-sm text-white/70 mb-6">Posted by: {trip.username}</p>
                                        </div>
                                        {isOwner && <button onClick={() => setIsEditing(true)} className="p-2 bg-white/20 rounded-lg hover:bg-white/30">Edit Trip</button>}
                                    </div>
                                    <img src={trip.imageUrl} alt={`Trip to ${trip.location}`} className="w-full h-80 object-cover rounded-lg mb-6" />
                                    <h2 className="text-2xl font-bold mb-2">Trip Details</h2>
                                    <p className="text-white/90 mb-2 whitespace-pre-wrap">{trip.description || 'No description provided.'}</p>
                                    {trip.cost > 0 && <p className="text-xl font-bold text-green-400 mb-8">Estimated Cost: ${trip.cost}</p>}
                                </>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-8 text-center">
                                <Link href="/itinerary" className="p-3 bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors">View Itinerary</Link>
                                {trip.linkedBlogId && <Link href={`/blog/${trip.linkedBlogId}`} className="p-3 bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors">Read Blog Post</Link>}
                                {(isOwner || isMember) && <button onClick={handleGoToChat} className="p-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">Group Chat</button>}
                            </div>

                            {/* Member List */}
                            <div className="my-8">
                                <h3 className="text-xl font-bold mb-4">Trip Members ({trip.accepted?.length || 0} / {trip.maxMembers})</h3>
                                <div className="flex flex-wrap gap-4">
                                    {trip.accepted?.map(memberId => <UserAvatar key={memberId} userId={memberId} />)}
                                </div>
                            </div>

                            {/* Link Blog Post */}
                            {(isOwner || isMember) && !trip.linkedBlogId && (
                                <div className="my-8 p-4 bg-black/20 rounded-lg">
                                    <h3 className="text-lg font-semibold mb-2">Link Your Blog Post</h3>
                                    <div className="flex gap-2">
                                        <select value={selectedBlogId} onChange={(e) => setSelectedBlogId(e.target.value)} className="w-full p-2 rounded-lg bg-white/5 text-white border-2 border-white/30">
                                            <option value="">Select your blog post...</option>
                                            {myBlogs.map(blog => <option key={blog.id} value={blog.id}>{blog.title}</option>)}
                                        </select>
                                        <button onClick={handleLinkBlog} disabled={!selectedBlogId} className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-gray-500">Link</button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-4 p-4 bg-black/20 rounded-lg">
                                <div><p className="font-semibold">{trip.accepted?.length || 0} / {trip.maxMembers} Members</p></div>
                                {isOwner && <button onClick={() => { fetchRequestingUsers(); setIsModalOpen(true); }} className="px-4 py-2 text-sm font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700">Manage Requests ({trip.requests.length})</button>}
                                {!isOwner && !isMember && <button onClick={handleRequestToJoin} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${hasRequested ? 'bg-yellow-500 text-black' : 'bg-green-600 text-white hover:bg-green-700'}`} disabled={hasRequested}>{hasRequested ? 'Request Sent' : 'Request to Join'}</button>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800/80 border border-white/20 rounded-2xl p-8 max-w-md w-full relative shadow-2xl">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white">✕</button>
                        <h3 className="text-2xl font-bold mb-4">Join Requests</h3>
                        <div className="space-y-3">
                            {requestingUsersData.length > 0 ? (
                                requestingUsersData.map(user => (
                                    <div key={user.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg">
                                        <UserAvatar userId={user.id} />
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRequestAction(user.id, 'accept')} className="px-3 py-1 text-xs bg-green-600 rounded-md hover:bg-green-700">Accept</button>
                                            <button onClick={() => handleRequestAction(user.id, 'decline')} className="px-3 py-1 text-xs bg-red-600 rounded-md hover:bg-red-700">Decline</button>
                                        </div>
                                    </div>
                                ))
                            ) : <p className="text-white/70 text-center">No pending requests.</p>}
                        </div>
                    </div>
                </div>
            )}
        </Suspense>
    );
};
