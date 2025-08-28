'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import NavigationBarDark from '@/components/NavigationBarDark';
import { useRouter } from 'next/navigation';

// --- Main Chat Page Component ---
export default function ChatPage() {
    const [user, setUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedChat, setSelectedChat] = useState({ chatId: null, recipient: null });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    // New state to manage authentication status for UI display
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Auth Listener: Sets the current user and triggers user list fetch
    useEffect(() => {
        console.log("[Auth] Setting up authentication listener...");
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                console.log("[Auth] User is logged in. UID:", currentUser.uid);
                setUser(currentUser);
                setIsAuthenticated(true); // User is authenticated, show chat UI
                fetchAllUsers(currentUser.uid);
            } else {
                console.log("[Auth] User is logged out. Showing login button.");
                setIsAuthenticated(false); // User is not authenticated, show login button
                setUser(null);
                setLoading(false);
            }
        });
        return () => {
            console.log("[Auth] Unsubscribing authentication listener.");
            unsubscribe();
        };
    }, []); // No router dependency needed here as we aren't using router.push directly

    // Fetches a list of all users from Firestore
    const fetchAllUsers = async (currentUserId) => {
        setLoading(true);
        console.log("[Firestore] Attempting to fetch all user profiles...");
        try {
            const usersRef = collection(db, "userProfiles");
            const querySnapshot = await getDocs(usersRef);
            const usersList = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(u => u.id !== currentUserId);
            
            console.log(`[Firestore] Fetched ${usersList.length} user(s).`);
            setAllUsers(usersList);
        } catch (error) {
            console.error("[Firestore] Error fetching users:", error);
        } finally {
            setLoading(false);
            console.log("[State] User loading complete.");
        }
    };

    // Filters users based on the search query
    const filteredUsers = allUsers.filter(u =>
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (timestamp) => {
        const date = new Date(timestamp.seconds * 1000);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    };

    // Handles the selection of a user to start/resume a chat
    const handleSelectUser = async (recipient) => {
        if (!user) {
            console.warn("[Interaction] Cannot select user, not authenticated.");
            return;
        }
        
        console.log(`[API] Attempting to find or create chat for users: ${user.uid} and ${recipient.id}`);
        try {
            const response = await fetch('/api/chats/find-or-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId1: user.uid, userId2: recipient.id }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`[API] Chat found or created successfully. Chat ID: ${data.chatId}`);
                setSelectedChat({ chatId: data.chatId, recipient });
            } else {
                console.error("[API] Failed to find or create chat. Server response:", data.error);
                throw new Error(data.error || 'Failed to start chat.');
            }
        } catch (err) {
            console.error("[API] Network or client error selecting user:", err);
            // In a real app, you'd set an error state here to display a message to the user
        }
    };

    // Conditional rendering based on authentication status
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen font-inter text-white flex flex-col items-center justify-center p-4"
                 style={{ backgroundImage: "url('/assets/chat.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="fixed inset-0 bg-black/60 z-10"></div>
                <div className="relative z-20 text-center p-8 bg-black/40 backdrop-blur-md rounded-xl shadow-lg border border-white/20">
                    <h1 className="text-2xl md:text-3xl font-bold mb-4 text-emerald-200">You must be logged in to chat.</h1>
                    <p className="text-xl text-emerald-300 mb-6">Please log in to see your conversations and connect with others.</p>
                    <button
                        onClick={() => router.push('/auth/login')}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-full text-lg transition-colors shadow-lg"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // Main chat UI rendered only if isAuthenticated is true
    return (
        <div className="min-h-screen font-inter text-white">
            <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/assets/chat.jpg')" }}></div>
            <div className="fixed inset-0 -z-10 bg-black/60"></div>
            <NavigationBarDark />
            <main className="p-4 md:p-8 max-w-7xl mx-auto">
                <div className="h-[calc(100vh-150px)] bg-black/20 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 flex" >
                    {/* Left Sidebar: User List */}
                    <div className="w-1/3 border-r border-white/20 flex flex-col">
                        <div className="p-4 border-b border-white/20">
                            <h2 className="text-3xl font-bold p-2">Conversations</h2>
                            {/* --- ADDED: Search Bar --- */}
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full mt-2 p-2 pl-5 rounded-lg bg-slate-800/50 border border-slate-700 focus:outline-none focus:border-green-500"
                            />
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {loading ? (
                                <p className="p-4 text-center">Loading users...</p>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map(u => (
                                    <UserListItem key={u.id} user={u} onSelect={() => handleSelectUser(u)} isSelected={selectedChat.recipient?.id === u.id} />
                                ))
                            ) : (
                                <p className="p-4 text-center text-slate-400">No users found.</p>
                            )}
                        </div>
                    </div>
                    {/* Right Side: Chat Window */}
                    <div className="w-2/3 flex flex-col">
                        {selectedChat.chatId ? (
                            <ChatWindow chatId={selectedChat.chatId} currentUser={user} recipient={selectedChat.recipient} formatDate={formatDate} />
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


// --- User List Item Component ---
function UserListItem({ user, onSelect, isSelected }) {
    return (
        <div onClick={onSelect} className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${isSelected ? 'bg-green-500/20' : 'hover:bg-white/10'}`}>
            <img src={user.profilePicture || 'https://placehold.co/40x40'} alt={user.fullName} className="w-10 h-10 rounded-full object-cover" />
            <div>
                <p className="font-semibold">{user.fullName}</p>
                <p className="text-sm text-slate-400">Click to chat</p>
            </div>
        </div>
    );
}

// --- Chat Window Component ---
function ChatWindow({ chatId, currentUser, recipient, formatDate }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const router = useRouter(); // <-- ADDED: initialize router

    // Listens for real-time updates to messages in the selected chat
    useEffect(() => {
        if (!chatId) {
            console.warn("[ChatWindow] No chatId provided. Skipping message listener setup.");
            setMessages([]); // Clear messages if chatId is null
            return;
        }

        console.log(`[Firestore] Setting up real-time listener for messages in chat ID: ${chatId}`);
        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            console.log("[Snapshot] Docs:", querySnapshot.docs.map(d => d.data()));
            setMessages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("[Snapshot] Error:", error);
        });

        return () => {
            console.log(`[Firestore] Unsubscribing from chat listener for chat ID: ${chatId}`);
            unsubscribe();
        };
    }, [chatId]);

    // Auto-scrolls to the latest message when a new one arrives
    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            console.log("[UI] Scrolled to bottom of messages.");
        }
    }, [messages]);

    // Handles sending a new message to the chat
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !chatId) {
            console.warn("[Interaction] Message is empty or no chat selected. Aborting send.");
            return;
        }
        
        console.log("[API] Attempting to send message via API...");
        try {
            const response = await fetch(`/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: currentUser.uid,
                    text: newMessage,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log("[API] Message sent successfully via API.");
                setNewMessage('');
            } else {
                console.error("[API] Failed to send message. Server response:", data.error);
            }
        } catch (error) {
            console.error("[API] Network error sending message:", error);
        }
    };

    return (
        <>
            <div className="p-4 border-b border-white/20 flex items-center gap-4">
                <img src={recipient.profilePicture || 'https://placehold.co/40x40'} alt={recipient.fullName} className="w-15 h-15 rounded-full object-cover" />
                <h2 className="text-xl font-bold">{recipient.fullName}</h2>
                {/* --- ADDED: Check Profile Button --- */}
                <button
                    onClick={() => router.push(`/Profilepage/${recipient.id}`)}
                    className="bg-teal-700 hover:bg-teal-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors ml-auto"
                >
                    Check Profile
                </button>
            </div>
            <div className="flex-grow p-4 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map((msg, index) => {
                        const showDateSeparator =
                            index === 0 ||
                            (msg.createdAt &&
                                messages[index - 1].createdAt &&
                                formatDate(msg.createdAt) !== formatDate(messages[index - 1].createdAt));

                        return (
                            <React.Fragment key={msg.id}>
                                {showDateSeparator && (
                                    <div className="flex justify-center my-4">
                                        <span className="bg-slate-700 text-sm px-4 py-1 rounded-full text-slate-300">
                                            {formatDate(msg.createdAt)}
                                        </span>
                                    </div>
                                )}
                                <div className={`flex ${msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.senderId === currentUser.uid ? 'bg-emerald-600 rounded-br-none' : 'bg-slate-600 rounded-bl-none'}`}>
                                        <p className="text-lg text-slate-100">{msg.text}</p>
                                        <p className="text-xs text-slate-200 mt-1 text-right">{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}</p>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })} 
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 border-t border-white/20">
                <form onSubmit={handleSendMessage} className="flex gap-4">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-grow bg-slate-800/50 border border-slate-700 rounded-lg p-3"
                    />
                    <button type="submit" className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold">Send</button>
                </form>
            </div>
        </>
    );
}