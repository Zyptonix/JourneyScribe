'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient.js';
import { collection, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';

// --- SVG ICONS ---
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663M12 12a3 3 0 100-6 3 3 0 000 6z" /></svg>;
const DocumentTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const CogIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5" /></svg>;
const ArrowLeftOnRectangleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.016h-.008v-.016z" /></svg>;

// --- MAIN APP COMPONENT ---
function App() {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await currentUser.getIdToken(true);
        setIdToken(token);
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  if (!user) {
    return <LoginForm />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-800 flex">
      <Sidebar userEmail={user.email} onLogout={handleLogout} currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'users' && <UserManagementView />}
        {currentView === 'blogs' && <BlogManagementView />}
        {currentView === 'setAdmin' && <SetAdminView loggedInUser={user} idToken={idToken} />}
        {currentView === 'trips' && <div className="text-zinc-900 text-2xl">Trip Management (Coming Soon!)</div>}
      </main>
    </div>
  );
}

// --- CHILD COMPONENTS ---

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center mb-6">🔑 Admin Portal</h1>
        <form onSubmit={handleLogin} className="w-full space-y-4">
          <input type="email" placeholder="admin@example.com" className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:ring-2 focus:ring-white/50 focus:outline-none" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="••••••••••" className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:ring-2 focus:ring-white/50 focus:outline-none" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-500 disabled:cursor-not-allowed py-3 px-4 rounded-md font-semibold text-black transition-colors" disabled={loading}>
            {loading ? 'Logging In...' : 'Log In'}
          </button>
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        </form>
      </div>
    </div>
  );
}

function Sidebar({ userEmail, onLogout, currentView, setCurrentView }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <ChartBarIcon /> },
    { id: 'users', label: 'Users', icon: <UsersIcon /> },
    { id: 'blogs', label: 'Blogs', icon: <DocumentTextIcon /> },
    { id: 'setAdmin', label: 'Set Admin', icon: <ShieldCheckIcon /> },
    { id: 'trips', label: 'Trips (Soon)', icon: <CogIcon /> },
  ];

  return (
    <aside className="w-64 bg-black border-r border-zinc-700 flex flex-col text-zinc-200">
      <div className="p-6 border-b border-zinc-800">
        <h2 className="text-xl font-bold text-white">Admin Panel</h2>
        <p className="text-xs text-zinc-400 truncate">{userEmail}</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            disabled={item.id === 'trips'}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors ${
              currentView === item.id 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-300 hover:bg-zinc-900'
            } ${item.id === 'trips' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-zinc-800">
        <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-2 rounded-md text-zinc-300 hover:bg-zinc-900 transition-colors">
          <ArrowLeftOnRectangleIcon />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

function DashboardView() {
  const [stats, setStats] = useState({ totalUsers: 0, totalBlogs: 0, popularDestination: '...' });
  const [chartData, setChartData] = useState(Array(12).fill(0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersSnapshot, blogsSnapshot] = await Promise.all([
          getDocs(collection(db, 'userProfiles')),
          getDocs(collection(db, 'blogs'))
        ]);

        const totalUsers = usersSnapshot.size;
        const monthlySignups = Array(12).fill(0);
        const now = new Date();
        usersSnapshot.forEach(doc => {
          const user = doc.data();
          if (user.createdAt && user.createdAt.toDate) {
            const signupDate = user.createdAt.toDate();
            const monthDiff = (now.getFullYear() - signupDate.getFullYear()) * 12 + (now.getMonth() - signupDate.getMonth());
            if (monthDiff >= 0 && monthDiff < 12) {
              const index = 11 - monthDiff;
              monthlySignups[index]++;
            }
          }
        });
        setChartData(monthlySignups);

        const totalBlogs = blogsSnapshot.size;
        const locationCounts = {};
        blogsSnapshot.forEach(doc => {
          const location = doc.data().location;
          if (location) {
            locationCounts[location] = (locationCounts[location] || 0) + 1;
          }
        });

        let maxCount = 0;
        let popularDestinations = [];
        for (const location in locationCounts) {
          const count = locationCounts[location];
          if (count > maxCount) {
            maxCount = count;
            popularDestinations = [location];
          } else if (count === maxCount) {
            popularDestinations.push(location);
          }
        }

        let finalDestination = 'N/A';
        if (popularDestinations.length > 0) {
          const randomIndex = Math.floor(Math.random() * popularDestinations.length);
          finalDestination = popularDestinations[randomIndex];
        }

        setStats({ totalUsers, totalBlogs, popularDestination: finalDestination });

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }
  
  const maxChartValue = Math.max(...chartData, 50);

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
          <h3 className="text-zinc-500 text-sm font-medium">Total Users</h3>
          <p className="text-3xl font-bold text-zinc-900">{loading ? '...' : stats.totalUsers.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
          <h3 className="text-zinc-500 text-sm font-medium">Total Blogs Posted</h3>
          <p className="text-3xl font-bold text-zinc-900">{loading ? '...' : stats.totalBlogs.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
          <h3 className="text-zinc-500 text-sm font-medium">Most Popular Destination</h3>
          <p className="text-3xl font-bold text-zinc-900">{loading ? '...' : stats.popularDestination}</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">User Sign-ups (Last 12 Months)</h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-zinc-500">Loading chart data...</div>
        ) : (
          <div className="h-64 flex items-end space-x-2" title="From 12 months ago to current month">
            {chartData.map((value, index) => (
              <div 
                key={index} 
                className="flex-1 bg-zinc-800 rounded-t-md hover:bg-zinc-700 transition-colors" 
                style={{ height: `${(value / maxChartValue) * 100}%` }} 
                title={`${value} sign-ups`}
              ></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserManagementView() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersCollectionRef = collection(db, 'userProfiles');
                const querySnapshot = await getDocs(usersCollectionRef);
                const usersList = querySnapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data(),
                }));
                setUsers(usersList);
            } catch (err) {
                console.error("Error fetching users:", err);
                setError("Failed to load user list.");
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleDeleteUser = async (userId, userFullName) => {
        if (!window.confirm(`Are you sure you want to permanently delete ${userFullName}? This action cannot be undone.`)) {
            return;
        }

        try {
            const idToken = await auth.currentUser.getIdToken(true);
            const response = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}`},
                body: JSON.stringify({ uid: userId }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete user.');
            }
            setUsers(currentUsers => currentUsers.filter(u => u.uid !== userId));
            alert(`Successfully deleted user: ${userFullName}.`);
        } catch (err) {
            console.error('Error deleting user:', err);
            alert(`Error: ${err.message}`);
        }
    };

    if (loading) return <p className="text-center text-zinc-500">Loading users...</p>;
    if (error) return <p className="text-center text-red-500">{error}</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-8">User Management</h1>
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
                        <tr>
                            <th className="p-4 font-semibold">Full Name</th>
                            <th className="p-4 font-semibold">Email</th>
                            <th className="p-4 font-semibold">Username</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {users.map(user => (
                            <tr key={user.uid} className="hover:bg-zinc-50">
                                <td className="p-4 font-medium text-zinc-800">{user.fullName || '(No Name)'}</td>
                                <td className="p-4 text-zinc-600">{user.email}</td>
                                <td className="p-4 text-zinc-600">@{user.username || '(No Username)'}</td>
                                <td className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <Link href={`/Profilepage/${user.uid}`} className="px-3 py-1 text-sm font-medium text-zinc-700 bg-zinc-200 hover:bg-zinc-300 rounded-md transition-colors">
                                            Profile
                                        </Link>
                                        <button 
                                            onClick={() => handleDeleteUser(user.uid, user.fullName)} 
                                            className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function BlogManagementView() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBlogsAndAuthors = async () => {
            setLoading(true);
            try {
                const blogsCollectionRef = collection(db, 'blogs');
                const blogSnapshot = await getDocs(blogsCollectionRef);
                const blogsList = blogSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                const authorIds = [...new Set(blogsList.map(blog => blog.authorId).filter(id => id))];

                const authorMap = new Map();
                if (authorIds.length > 0) {
                    const authorPromises = authorIds.map(id => getDoc(doc(db, 'userProfiles', id)));
                    const authorSnapshots = await Promise.all(authorPromises);

                    authorSnapshots.forEach(docSnap => {
                        if (docSnap.exists()) {
                            authorMap.set(docSnap.id, docSnap.data().fullName);
                        }
                    });
                }

                const blogsWithAuthors = blogsList.map(blog => ({
                    ...blog,
                    authorName: authorMap.get(blog.authorId) || 'Unknown Author'
                }));

                setBlogs(blogsWithAuthors);

            } catch (err) {
                console.error("Error fetching blogs and authors:", err);
                setError("Failed to load blog list from Firestore.");
            } finally {
                setLoading(false);
            }
        };

        fetchBlogsAndAuthors();
    }, []);

    const handleDeleteBlog = async (blogId, blogTitle) => {
        if (!window.confirm(`Are you sure you want to permanently delete the blog "${blogTitle}"?`)) {
            return;
        }
        try {
            const blogDocRef = doc(db, 'blogs', blogId);
            await deleteDoc(blogDocRef);
            setBlogs(currentBlogs => currentBlogs.filter(blog => blog.id !== blogId));
        } catch (err) {
            console.error("Error deleting blog: ", err);
            alert("Error: Could not delete the blog. Please check the console for more details.");
        }
    };

    if (loading) {
        return <p className="text-center text-zinc-500">Loading blogs...</p>;
    }
    if (error) {
        return <p className="text-center text-red-500">{error}</p>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-8">Blog Management</h1>
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
                        <tr>
                            <th className="p-4 font-semibold">Title</th>
                            <th className="p-4 font-semibold">Location</th>
                            <th className="p-4 font-semibold">Author</th>
                            <th className="p-4 font-semibold">Views</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {blogs.map(blog => (
                            <tr key={blog.id} className="hover:bg-zinc-50">
                                <td className="p-4 font-medium text-zinc-800">{blog.title || 'Untitled'}</td>
                                <td className="p-4 text-zinc-600">{blog.location || 'No Location'}</td>
                                <td className="p-4 text-zinc-600">{blog.authorName}</td>
                                <td className="p-4 text-zinc-600">{blog.viewCount?.toLocaleString() || 0}</td>
                                <td className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <Link
                                            href={`/blog/${blog.id}`}
                                            className="px-3 py-1 text-sm font-medium text-zinc-700 bg-zinc-200 hover:bg-zinc-300 rounded-md transition-colors"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            View Post
                                        </Link>
                                        <button 
                                            onClick={() => handleDeleteBlog(blog.id, blog.title)} 
                                            className="text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SetAdminView({ loggedInUser, idToken }) {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!loggedInUser) return;
      try {
        setUsersLoading(true);
        const usersCollectionRef = collection(db, 'userProfiles');
        const querySnapshot = await getDocs(usersCollectionRef);
        const usersList = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }));
        setUsers(usersList);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError('Failed to load the user list from Firestore.');
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, [loggedInUser]);

  const handleSetAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponseMessage('');
    if (!idToken) {
      setError('You must be logged in to perform this action.');
      setLoading(false);
      return;
    }
    if (!selectedUid) {
      setError('Please select a user from the list.');
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/admin/set-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ uid: selectedUid }),
      });
      const data = await response.json();
      if (response.ok) {
        const selectedUserName = users.find(u => u.uid === selectedUid)?.fullName || selectedUid;
        setResponseMessage(data.message || `Successfully set admin claim for ${selectedUserName}`);
        setSelectedUid('');
      } else {
        throw new Error(data.message || 'Failed to set admin claim.');
      }
    } catch (err) {
      setError(`Error setting admin claim: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-900 mb-8">Set Admin Claim</h1>
      <div className="max-w-full min-h-full space-y-6">
        <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-zinc-900">Select a User</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Click on a user in the list below to select them, then click the button to grant them admin privileges.
          </p>
          <form onSubmit={handleSetAdmin}>
            <div className="w-full p-2 mb-4 bg-zinc-100 border border-zinc-200 rounded-md max-h-60 overflow-y-auto space-y-1">
              {usersLoading ? (
                <p className="text-zinc-800 text-center p-3">Loading user list...</p>
              ) : users.length === 0 ? (
                 <p className="text-zinc-800 text-center p-3">No users found.</p>
              ) : (
                users.map(user => (
                  <button
                    type="button"
                    key={user.uid}
                    onClick={() => setSelectedUid(user.uid)}
                    className={`w-full text-left p-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 ${
                      selectedUid === user.uid
                        ? 'bg-zinc-400 text-white'
                        : 'bg-white hover:bg-zinc-200'
                    }`}
                  >
                    <p className="font-semibold text-zinc-800">{user.fullName || 'No Name Provided'}</p>
                    <p className="text-xs text-zinc-700">{user.email}</p>
                  </button>
                ))
              )}
            </div>
            <button
              type="submit"
              className="w-full flex justify-center items-center bg-black hover:bg-zinc-800 disabled:bg-zinc-400 disabled:cursor-not-allowed py-3 px-4 rounded-md font-semibold text-white transition-colors"
              disabled={loading || usersLoading || !selectedUid}
            >
              {loading ? 'Processing...' : `Set ${users.find(u => u.uid === selectedUid)?.fullName || 'User'} as Admin`}
            </button>
          </form>
        </div>
        {(responseMessage || error) && (
          <div className={`p-4 rounded-lg border ${error ? 'border-red-500/50 bg-red-500/10 text-red-700' : 'border-green-500/50 bg-green-500/10 text-green-800'}`}>
            <h3 className="font-bold mb-2">Result:</h3>
            <p className="text-sm whitespace-pre-wrap">{error || responseMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
