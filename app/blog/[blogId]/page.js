'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { auth } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import NavigationBarDark from '@/components/NavigationBarDark';

export default function BlogPostPage() {
    const { blogId } = useParams();
    const [blog, setBlog] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);

    const fetchBlogAndComments = useCallback(async () => {
        if (!blogId) return;
        setLoading(true);
        setError('');
        try {
            // Fetch blog post
            const blogRes = await fetch(`/api/blogs/${blogId}`);
            const blogData = await blogRes.json();
            if (!blogRes.ok) throw new Error(blogData.error || 'Failed to fetch blog post.');
            setBlog(blogData);

            // Fetch comments
            const commentsRes = await fetch(`/api/blogs/${blogId}/comments`);
            const commentsData = await commentsRes.json();
            if (!commentsRes.ok) throw new Error(commentsData.error || 'Failed to fetch comments.');
            setComments(commentsData);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [blogId]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        fetchBlogAndComments();
        return () => unsubscribe();
    }, [fetchBlogAndComments]);

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Post...</div>;
    if (error) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400">{error}</div>;
    if (!blog) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Blog post not found.</div>;

    return (
        <div className="min-h-screen font-inter bg-slate-900 text-white">
            <div className="fixed inset-0 -z-10 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop')" }}></div>
            <NavigationBarDark />
            <main className="p-4 md:p-8 max-w-4xl mx-auto">
                <article className="bg-slate-800/50 p-8 rounded-xl border border-slate-700">
                    <p className="text-cyan-400 font-semibold">{blog.location}</p>
                    <h1 className="text-4xl font-extrabold mt-2">{blog.title}</h1>
                    <p className="text-sm text-slate-400 mt-2">Posted on {new Date(blog.createdAt.seconds * 1000).toLocaleDateString()}</p>
                    <div className="prose prose-invert mt-6 whitespace-pre-wrap">{blog.content}</div>
                </article>
                
                <section className="mt-12">
                    <h2 className="text-2xl font-bold mb-6">Comments ({comments.length})</h2>
                    <div className="space-y-4">
                        {comments.map(comment => (
                            <div key={comment.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                <p className="text-slate-300">{comment.text}</p>
                                <p className="text-xs text-slate-500 mt-2">Comment by User {comment.userId.substring(0, 6)}...</p>
                            </div>
                        ))}
                    </div>
                    {user && <CommentForm blogId={blog.id} userId={user.uid} onCommentPosted={fetchBlogAndComments} />}
                </section>
            </main>
        </div>
    );
}

// --- Comment Form Component ---
function CommentForm({ blogId, userId, onCommentPosted }) {
    const [text, setText] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!text) return;

        try {
            const response = await fetch(`/api/blogs/${blogId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, userId }),
            });
            if (response.ok) {
                setText('');
                onCommentPosted(); // Refresh comments
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to post comment.');
            }
        } catch (err) {
            setError('A network error occurred.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-8 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h3 className="text-xl font-semibold mb-3">Leave a Comment</h3>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share your thoughts..." className="w-full bg-slate-700/50 p-3 rounded-lg h-24" required />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <button type="submit" className="mt-3 w-full bg-cyan-600 hover:bg-cyan-700 p-3 rounded-lg font-semibold">Post Comment</button>
        </form>
    );
}
