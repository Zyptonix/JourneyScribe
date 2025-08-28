'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import NavigationBarDark from '@/components/NavigationBarDark';

export default function CreateBlogPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [location, setLocation] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/auth/login'); // Redirect if not logged in
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('You must be logged in to post.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/blogs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, location, authorId: user.uid }),
            });
            if (response.ok) {
                router.push('/blog'); // Redirect to blog home on success
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to create post.');
            }
        } catch (err) {
            setError('A network error occurred.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen font-inter bg-slate-900 text-white">
            <div className="fixed inset-0 -z-10 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=2070&auto=format&fit=crop')" }}></div>
            <NavigationBarDark />
            <main className="p-4 md:p-8 max-w-4xl mx-auto">
                <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700">
                    <h1 className="text-4xl font-extrabold mb-6">Share a New Story</h1>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="text" placeholder="Blog Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-700/50 p-3 rounded-lg" required />
                        <input type="text" placeholder="Location (e.g., Paris, France)" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-slate-700/50 p-3 rounded-lg" required />
                        <textarea placeholder="Tell your story..." value={content} onChange={(e) => setContent(e.target.value)} className="w-full bg-slate-700/50 p-3 rounded-lg h-60" required />
                        {error && <p className="text-red-400">{error}</p>}
                        <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 p-3 rounded-lg font-semibold" disabled={loading}>
                            {loading ? 'Posting...' : 'Publish Story'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
