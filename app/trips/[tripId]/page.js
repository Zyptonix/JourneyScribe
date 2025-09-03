'use client';

import React, { Suspense, useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebaseClient.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, query, collection, where, updateDoc } from 'firebase/firestore';
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

// --- Main Component ---
const currencyOptions = ['BDT', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

export default function TripDetailsPage({ params }) {
    const [userId, setUserId] = useState(null);
    const [trip, setTrip] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [requestingUsersData, setRequestingUsersData] = useState([]);
    const [myBlogs, setMyBlogs] = useState([]);
    const [selectedBlogId, setSelectedBlogId] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editForm, setEditForm] = useState({ 
        location: '', 
        duration: '', 
        description: '', 
        cost: '', 
        currency: 'BDT',
        startDate: '', 
        endDate: '' 
    });

    const router = useRouter();
    const { tripId } = use(params);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setUserId(currentUser.uid);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!tripId) return;
        const postRef = doc(db, `trips`, tripId);
        const unsubscribe = onSnapshot(postRef, (doc) => {
            if (doc.exists()) {
                setTrip({ id: doc.id, ...doc.data() });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [tripId]);
    
    useEffect(() => {
        if (editForm.startDate && editForm.endDate) {
            const start = new Date(editForm.startDate);
            const end = new Date(editForm.endDate);
            if (end > start) {
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                setEditForm(prev => ({ ...prev, duration: `${diffDays} days` }));
            } else {
                setEditForm(prev => ({ ...prev, duration: '' }));
            }
        }
    }, [editForm.startDate, editForm.endDate]);

    const fetchRequestingUsers = async () => {
        if (!trip || !trip.requests || trip.requests.length === 0) {
            setRequestingUsersData([]);
            return;
        }
        const userPromises = trip.requests.map(id => getDoc(doc(db, 'userProfiles', id)));
        const userDocs = await Promise.all(userPromises);
        setRequestingUsersData(userDocs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const handleEditClick = () => {
        if (!trip) return;
        setEditForm({
            location: trip.location || '',
            duration: trip.duration || '',
            description: trip.description || '',
            cost: trip.cost || '',
            currency: trip.currency || 'BDT',
            startDate: trip.startDate || '',
            endDate: trip.endDate || '',
        });
        setIsEditing(true);
    };

    const handleUpdateTrip = async (e) => {
        e.preventDefault();
        if (!user) return alert('You must be logged in to update a trip.');
        if (!editForm.location) return alert('Location is a required field.');

        setIsUpdating(true);
        try {
            const idToken = await user.getIdToken();
            const response = await fetch(`/api/trips/${tripId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify(editForm)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update the trip.');
            }

            setIsEditing(false);
        } catch (error) {
            console.error('Error updating trip:', error);
            alert(`Update failed: ${error.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRequestToJoin = async () => {
        if (!user) return alert("Please sign in to request to join a trip.");
        try {
            const idToken = await user.getIdToken();
            await fetch(`/api/trips/${tripId}/request-join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
        } catch (error) {
            console.error('Error sending join request:', error);
        }
    };
    
    const handleGoToChat = () => {
        localStorage.setItem('selectedTripId', tripId);
        router.push('/chat'); 
    };
    
    const handleRemoveMember = async (memberIdToRemove) => {
        if (!user) return;
        const memberData = await getDoc(doc(db, 'userProfiles', memberIdToRemove));
        const memberName = memberData.exists() ? memberData.data().fullName : 'this member';
        if (!window.confirm(`Are you sure you want to remove ${memberName} from the trip?`)) return;
        try {
            const idToken = await user.getIdToken();
            await fetch(`/api/trips/${tripId}/remove-member`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ memberIdToRemove })
            });
        } catch (error) {
            console.error('Error removing member:', error);
            alert('Failed to remove member.');
        }
    };
    
    const handleLeaveTrip = async () => {
        if (!user || !window.confirm('Are you sure you want to leave this trip?')) return;
        await handleRemoveMember(user.uid);
    };

    const handleLinkBlog = async () => {
        if (!selectedBlogId) return alert("Please select a blog post first.");
        try {
            const postRef = doc(db, `trips`, tripId);
            await updateDoc(postRef, { linkedBlogId: selectedBlogId });
            setSelectedBlogId('');
        } catch (error) {
            console.error("Error linking blog post:", error);
            alert("There was an error linking your blog post.");
        }
    };
    
    const handleRequestAction = async (requestUserId, action) => {
        if (!user) return;
        try {
            const idToken = await user.getIdToken();
            const response = await fetch(`/api/trips/${tripId}/manage-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ requestUserId, action })
            });
            if (!response.ok) throw new Error('Failed to update request.');
            if (trip.requests.length === 1) setIsModalOpen(false);
        } catch (error) { 
            console.error(`Error ${action}ing request:`, error); 
        }
    };
    
    useEffect(() => {
        if (!userId) {
            setMyBlogs([]);
            return;
        };
        const blogsQuery = query(collection(db, 'blogs'), where("authorId", "==", userId));
        const unsubscribe = onSnapshot(blogsQuery, (snapshot) => {
            setMyBlogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [userId]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading Trip...</div>;
    if (!trip) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Trip not found.</div>;
    
    const formattedCost = trip.cost ? `${trip.currency || 'USD'} ${parseFloat(trip.cost).toLocaleString()}` : 'Not Specified';
    const isOwner = userId === trip.userId;
    const isMember = trip.accepted?.includes(userId);
    const hasRequested = trip.requests?.includes(userId);
    const getTripStatus = () => {
        const now = new Date();
        const start = trip.startDate ? new Date(trip.startDate) : null;
        const end = trip.endDate ? new Date(trip.endDate) : null;
        if (!start) return { text: 'Planning', color: 'bg-yellow-500' };
        if (now < start) return { text: 'Upcoming', color: 'bg-blue-500' };
        if (now >= start && (!end || now <= end)) return { text: 'Ongoing', color: 'bg-green-500' };
        return { text: 'Completed', color: 'bg-gray-500' };
    };
    const status = getTripStatus();

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
                                    {/* --- EDIT FORM --- */}
                                    <h2 className="text-3xl font-bold mb-4">Editing Trip</h2>
                                    <input type="text" value={editForm.location} onChange={(e) => setEditForm({...editForm, location: e.target.value})} placeholder="Location" className="w-full p-3 text-4xl font-extrabold bg-white/10 rounded-lg border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({...editForm, startDate: e.target.value})} className="w-full p-2 text-lg bg-white/10 rounded-lg border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                                        <input type="date" value={editForm.endDate} onChange={(e) => setEditForm({...editForm, endDate: e.target.value})} className="w-full p-2 text-lg bg-white/10 rounded-lg border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                                    </div>
                                    <input type="text" value={editForm.duration} readOnly placeholder="Duration (auto-calculated)" className="w-full p-2 text-lg bg-white/5 text-white/70 rounded-lg border-2 border-white/30 focus:outline-none" />
                                    <textarea value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} placeholder="Description" rows="5" className="w-full p-2 bg-white/10 rounded-lg border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                                    <div className="flex items-center space-x-2">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-white/80 mb-2">Estimated Cost</label>
                                            <input type="number" step="0.01" value={editForm.cost} onChange={(e) => setEditForm({...editForm, cost: e.target.value})} placeholder="Trip Cost" className="w-full p-2 bg-white/10 rounded-lg border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-2">Currency</label>
                                            <select value={editForm.currency} onChange={(e) => setEditForm({...editForm, currency: e.target.value})} className="w-full p-2 rounded-lg bg-white/10 text-white border-2 border-white/30 focus:outline-none focus:border-blue-400">
                                                {currencyOptions.map(option => (
                                                    <option key={option} value={option} className="bg-gray-800">{option}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button type="submit" disabled={isUpdating} className="flex-1 p-3 bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed">
                                            {isUpdating ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button type="button" onClick={() => setIsEditing(false)} disabled={isUpdating} className="flex-1 p-3 bg-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    {/* --- VIEW MODE --- */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h1 className="text-4xl md:text-5xl font-extrabold mb-2">{trip.location}</h1>
                                            <div className="flex items-center gap-4 mb-4">
                                                <p className="text-lg text-white/80">{trip.duration}</p>
                                                <span className={`px-3 py-1 text-sm font-bold rounded-full ${status.color}`}>{status.text}</span>
                                            </div>
                                            <div className="mb-6"><UserAvatar userId={trip.userId} /></div>
                                        </div>
                                        {isOwner && <button onClick={handleEditClick} className="p-2 bg-white/20 rounded-lg hover:bg-white/30">Edit Trip</button>}
                                    </div>
                                    <img src={trip.imageUrl} alt={`Trip to ${trip.location}`} className="w-full h-80 object-cover rounded-lg mb-6" />
                                    <h2 className="text-2xl font-bold mb-2">Trip Details</h2>
                                    <p className="text-white/90 mb-2 whitespace-pre-wrap">{trip.description || 'No description provided.'}</p>
                                    {trip.cost > 0 && <p className="text-xl font-bold text-green-400 mb-8">Estimated Cost: {formattedCost}</p>}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-8 text-center">
                                        <Link href="/itinerary" className="p-3 bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors">View Itinerary</Link>
                                        {trip.linkedBlogId && <Link href={`/blog/${trip.linkedBlogId}`} className="p-3 bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors">Read Blog Post</Link>}
                                        {(isOwner || isMember) && <button onClick={handleGoToChat} className="p-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">Group Chat</button>}
                                    </div>
                                    <div className="my-8">
                                        <h3 className="text-xl font-bold mb-4">Trip Members ({trip.accepted?.length || 0} / {trip.maxMembers})</h3>
                                        <div className="space-y-3">
                                            {trip.accepted?.map(memberId => (
                                                <div key={memberId} className="flex items-center justify-between">
                                                    <UserAvatar userId={memberId} />
                                                    {isOwner && userId !== memberId && (
                                                        <button onClick={() => handleRemoveMember(memberId)} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 px-2 py-1 rounded-md transition-colors">Remove</button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {(isOwner || isMember) && !trip.linkedBlogId && (
                                        <div className="my-8 p-4 bg-black/20 rounded-lg">
                                            <h3 className="text-lg font-semibold mb-2">Link Your Blog Post</h3>
                                            <div className="flex gap-2">
                                                <select value={selectedBlogId} onChange={(e) => setSelectedBlogId(e.target.value)} className="w-full p-2 rounded-lg bg-white/5 text-white border-2 border-white/30">
                                                    <option value="" className='bg-gray-800'>Select your blog post...</option>
                                                    {myBlogs.map(blog => <option className='bg-gray-800' key={blog.id} value={blog.id}>{blog.title}</option>)}
                                                </select>
                                                <button onClick={handleLinkBlog} disabled={!selectedBlogId} className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-gray-500">Link</button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mt-4 p-4 bg-black/20 rounded-lg">
                                        <div><p className="font-semibold">{trip.accepted?.length || 0} / {trip.maxMembers} Members</p></div>
                                        {isOwner && <button onClick={() => { fetchRequestingUsers(); setIsModalOpen(true); }} className="px-4 py-2 text-sm font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700">Manage Requests ({trip.requests?.length || 0})</button>}
                                        {!isOwner && !isMember && <button onClick={handleRequestToJoin} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${hasRequested ? 'bg-yellow-500 text-black' : 'bg-green-600 text-white hover:bg-green-700'}`} disabled={hasRequested}>{hasRequested ? 'Request Sent' : 'Request to Join'}</button>}
                                        {isMember && !isOwner && <button onClick={handleLeaveTrip} className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700">Leave Trip</button>}
                                    </div>
                                </>
                            )}
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