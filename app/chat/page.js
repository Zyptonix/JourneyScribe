'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp, orderBy, doc } from 'firebase/firestore';
import NavigationBarDark from '@/components/NavigationBarDark';
import { useRouter } from 'next/navigation';

// --- Global Variables ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;


// --- Helper Functions & Components ---

// Generates a consistent, random color for a user ID
const userColors = [
    'text-emerald-300', 'text-sky-300', 'text-amber-300', 'text-rose-300',
    'text-indigo-300', 'text-teal-300', 'text-pink-300', 'text-yellow-300'
];
const getUserColor = (userId) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return userColors[Math.abs(hash) % userColors.length];
};

const UserAvatar = ({ userId }) => {
    const [userData, setUserData] = useState({ fullName: '...', profilePicture: '' });
    useEffect(() => {
        const userRef = doc(db, 'userProfiles', userId);
        const unsub = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                setUserData(doc.data());
            }
        });
        return () => unsub();
    }, [userId]);

    return (
        <div className="flex items-center gap-2">
            <img src={userData.profilePicture || `https://placehold.co/40x40/1f2937/ffffff?text=${userData.fullName?.[0] || '?'}`} alt={userData.fullName} className="w-8 h-8 rounded-full object-cover" />
            <span className={`font-semibold ${getUserColor(userId)}`}>{userData.fullName}</span>
        </div>
    );
};

// --- List Item Components ---
function UserListItem({ user, onSelect, isSelected }) {
    return (
        <div onClick={onSelect} className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${isSelected ? 'bg-green-500/20' : 'hover:bg-white/10'}`}>
            <img src={user.profilePicture || 'https://placehold.co/40x40'} alt={user.fullName} className="w-10 h-10 rounded-full object-cover" />
            <div>
                <p className="font-semibold">{user.fullName}</p>
                <p className="text-sm text-slate-400">Direct Message</p>
            </div>
        </div>
    );
}

function TripChatItem({ trip, onSelect, isSelected }) {
    return (
        <div onClick={onSelect} className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${isSelected ? 'bg-green-500/20' : 'hover:bg-white/10'}`}>
            <img src={trip.imageUrl || 'https://placehold.co/40x40'} alt={trip.location} className="w-12 h-12 rounded-lg object-cover" />
            <div>
                <p className="font-semibold text-lg">{trip.location}</p>
                <p className="text-sm text-slate-400">{trip.accepted.length} member{trip.accepted.length !== 1 ? 's' : ''}</p>
            </div>
        </div>
    );
}

// --- Unified Chat Window Component ---
// This is the updated component for your app/chat/page.js file

function ChatWindow({ chatInfo, currentUser }) {
    // --- ADD THIS LOG TO DEBUG ---
    // This will show us if the props are disappearing during a re-render.
    console.log("ChatWindow Props Received:", { chatInfo, currentUser });

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const router = useRouter();

    const { type, id, data } = chatInfo;

    // This useEffect for listening to messages is correct and remains the same
    useEffect(() => {
        if (!id || !type) return; // Prevent running with invalid info
        let messagesRef;
        if (type === 'user') {
            messagesRef = collection(db, "chats", id, "messages");
        } else { // type === 'trip'
            messagesRef = collection(db, `artifacts/${appId}/public/data/trips`, id, "messages");
        }
        const q = query(messagesRef, orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setMessages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [id, type]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- REVISED AND MORE STABLE handleSendMessage FUNCTION ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !currentUser) {
            console.log("Send cancelled: Empty message or no user.");
            return;
        }

        try {
            console.log("1. Getting auth token...");
            const idToken = await currentUser.getIdToken();
            console.log("2. Auth token received.");

            const response = await fetch('/api/chats/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    text: newMessage,
                    chatId: id,
                    chatType: type,
                }),
            });

            console.log("3. API response received:", response.status);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'API request failed');
            }
            
            // 4. Only clear the input AFTER the message is successfully sent
            setNewMessage('');
            console.log("5. Message sent and input cleared successfully.");

        } catch (error) {
            console.error("🔴 Error sending message:", error);
            // Optionally, show an error to the user here
        }
    };

    // If data is missing, the header would break. This prevents that.
    if (!data) {
        return (
            <div className="flex-grow flex items-center justify-center">
                <p className="text-slate-400">Loading chat information...</p>
            </div>
        );
    }
    
    const headerTitle = type === 'user' ? data.fullName : data.location;
    const headerImage = type === 'user' ? data.profilePicture : data.imageUrl;

    return (
        <>
            {/* The JSX part remains unchanged */}
            <div className="p-4 border-b border-white/20 flex items-center gap-4">
                <img src={headerImage || 'https://placehold.co/40x40'} alt={headerTitle} className={type === 'user' ? 'w-12 h-12 rounded-full object-cover' : 'w-12 h-12 rounded-lg object-cover'} />
                <h2 className="text-xl font-bold">{headerTitle}</h2>
                {type === 'user' && (
                    <button onClick={() => router.push(`/Profilepage/${data.id}`)} className="bg-teal-700 hover:bg-teal-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors ml-auto">
                        Check Profile
                    </button>
                )}
            </div>
            <div className="flex-grow p-4 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex gap-3 ${msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.senderId === currentUser.uid ? 'bg-emerald-600 rounded-br-none' : 'bg-slate-600 rounded-bl-none'}`}>
                                {type === 'trip' && msg.senderId !== currentUser.uid && (
                                    <div className="text-sm font-semibold mb-1">
                                        <UserAvatar userId={msg.senderId} />
                                    </div>
                                )}
                                <p className="text-lg text-slate-100">{msg.text}</p>
                                <p className="text-xs text-slate-200 mt-1 text-right">{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 border-t border-white/20">
                <form onSubmit={handleSendMessage} className="flex gap-4">
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-grow bg-slate-800/50 border border-slate-700 rounded-lg p-3 focus:outline-none focus:border-green-500" />
                    <button type="submit" className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold">Send</button>
                </form>
            </div>
        </>
    );
}

// --- Main Chat Page Component ---
export default function ChatPage() {
    const [user, setUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [myTrips, setMyTrips] = useState([]);
    const [selectedChat, setSelectedChat] = useState({ type: null, id: null, data: null });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Effect for handling authentication state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
                setUser(null);
                setLoading(false); // Stop loading if user is not logged in
            }
        });
        return () => unsubscribe();
    }, []);

    // Effect for fetching data once the user is authenticated
    useEffect(() => {
        if (!user) return; // Don't run if there's no user

        setLoading(true);

        const fetchAllUsers = async (currentUserId) => {
            const usersRef = collection(db, "userProfiles");
            const querySnapshot = await getDocs(usersRef);
            const usersList = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(u => u.id !== currentUserId);
            setAllUsers(usersList);
        };

        const fetchMyTrips = (currentUserId) => {
            const tripsRef = collection(db, `artifacts/${appId}/public/data/trips`);
            const q = query(tripsRef, where("accepted", "array-contains", currentUserId));
            // Return the unsubscribe function for cleanup
            return onSnapshot(q, (snapshot) => {
                setMyTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        };

        fetchAllUsers(user.uid).finally(() => setLoading(false));
        const unsubscribeTrips = fetchMyTrips(user.uid);

        // Cleanup function for the trips listener
        return () => {
            unsubscribeTrips();
        };

    }, [user]); // This effect re-runs when the user object changes

    const handleSelectUser = async (recipient) => {
        if (!user) return;
        try {
            const response = await fetch('/api/chats/find-or-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId1: user.uid, userId2: recipient.id }),
            });
            const data = await response.json();
            if (response.ok) {
                setSelectedChat({ type: 'user', id: data.chatId, data: recipient });
            } else {
                throw new Error(data.error || 'Failed to start chat.');
            }
        } catch (err) {
            console.error("Error selecting user:", err);
        }
    };
    
    const handleSelectTrip = (trip) => {
        setSelectedChat({ type: 'trip', id: trip.id, data: trip });
    };

    const filteredUsers = allUsers.filter(u =>
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen font-inter text-white flex flex-col items-center justify-center p-4"
                 style={{ backgroundImage: "url('/assets/chat.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="fixed inset-0 bg-black/60 z-10"></div>
                <div className="relative z-20 text-center p-8 bg-black/40 backdrop-blur-md rounded-xl shadow-lg border border-white/20">
                    <h1 className="text-2xl md:text-3xl font-bold mb-4 text-emerald-200">You must be logged in to chat.</h1>
                    <p className="text-xl text-emerald-300 mb-6">Please log in to see your conversations and connect with others.</p>
                    <button onClick={() => router.push('/auth/login')} className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-full text-lg transition-colors shadow-lg">
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-inter text-white">
            <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/assets/chat.jpg')" }}></div>
            <div className="fixed inset-0 -z-10 bg-black/60"></div>
            <NavigationBarDark />
            <main className="p-4 md:p-8 max-w-7xl mx-auto">
                <div className="h-[calc(100vh-150px)] bg-black/20 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 flex">
                    {/* Left Sidebar */}
                    <div className="w-1/3 border-r border-white/20 flex flex-col">
                        <div className="p-4 border-b border-white/20">
                            <h2 className="text-2xl font-bold p-2">Conversations</h2>
                            <input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full mt-2 p-2 pl-5 rounded-lg bg-slate-800/50 border border-slate-700 focus:outline-none focus:border-green-500" />
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {loading ? <p className="p-4 text-center">Loading...</p> : 
                            <>
                                {/* User List for 1-on-1 Chats */}
                                {filteredUsers.map(u => (
                                    <UserListItem key={u.id} user={u} onSelect={() => handleSelectUser(u)} isSelected={selectedChat.type === 'user' && selectedChat.data?.id === u.id} />
                                ))}
                                
                                {/* Trip Chats Section */}
                                {myTrips.length > 0 && (
                                    <>
                                        <h3 className="text-lg font-bold p-4 mt-4 border-t border-white/20">Trip Chats</h3>
                                        {myTrips.map(trip => (
                                            <TripChatItem key={trip.id} trip={trip} onSelect={() => handleSelectTrip(trip)} isSelected={selectedChat.type === 'trip' && selectedChat.id === trip.id} />
                                        ))}
                                    </>
                                )}
                            </>
                            }
                        </div>
                    </div>
                    {/* Right Side: Chat Window */}
                    <div className="w-2/3 flex flex-col">
                        {selectedChat.id ? (
                            <ChatWindow chatInfo={selectedChat} currentUser={user} />
                        ) : (
                            <div className="flex-grow flex items-center justify-center">
                                <p className="text-slate-400">Select a conversation to start chatting.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
