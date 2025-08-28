'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebaseClient'; // Make sure db is exported
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'; // Import Firestore functions
import NavigationBarDark from '@/components/NavigationBarDark';


export default function BlogPostPage() {
    const { blogId } = useParams();
    const [blog, setBlog] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentAuthors, setCommentAuthors] = useState({}); // New state for usernames
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const router = useRouter();
    const fetchBlogAndComments = useCallback(async () => {
        if (!blogId) return;
        setLoading(true);
        setError('');
        try {
            // Increment view count (fire and forget)
            fetch(`/api/blogs/${blogId}`, { method: 'POST' });

            // Fetch blog post details
            const blogRes = await fetch(`/api/blogs/${blogId}`);
            const blogData = await blogRes.json();
            if (!blogRes.ok) throw new Error(blogData.error || 'Failed to fetch blog post.');
            setBlog(blogData);

            // Fetch comments
            const commentsRes = await fetch(`/api/blogs/${blogId}/comments`);
            const commentsData = await commentsRes.json();
            if (!commentsRes.ok) throw new Error(commentsData.error || 'Failed to fetch comments.');
            setComments(commentsData);

            // --- MODIFIED: Fetch fullName for comments ---
            if (commentsData.length > 0) {
                const authorIds = [...new Set(commentsData.map(c => c.userId))];
                const authors = {};
                
                const profilesRef = collection(db, 'userProfiles');
                const q = query(profilesRef, where('__name__', 'in', authorIds));
                const querySnapshot = await getDocs(q);
                
                querySnapshot.forEach(doc => {
                    // Get fullName instead of username
                    authors[doc.id] = doc.data().fullName || 'Anonymous';
                });
                setCommentAuthors(authors);
            }
            // --- END MODIFIED ---

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [blogId]);
  
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        fetchBlogAndComments();
        return () => unsubscribe();
    }, [fetchBlogAndComments]);

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Post...</div>;
    if (error) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400">{error}</div>;
    if (!blog) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Blog post not found.</div>;

    return (
        <div className="min-h-screen font-inter text-white">
            <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: `url(${blog.thumbnail})` }}></div>
            <div className="fixed inset-0 -z-10 bg-black/60 backdrop-blur-sm"></div>
            <NavigationBarDark />
            {/* --- MODIFIED: Increased width to 9xl --- */}
            <main className="p-4 md:p-8 max-w-9/10 mx-auto">
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden">
                    
                    {/* --- NEW LAYOUT: Header on top --- */}
                    <div className="p-6 md:p-8">
                        <p className="text-cyan-400 font-semibold">{blog.location}</p>
                        <h1 className="text-4xl md:text-4xl font-extrabold text-white mt-2">{blog.title}</h1>
                        <div className="flex items-center gap-4 mt-4 text-md">
                            <div>
                                <p className="text-slate-200">by <span className="font-semibold">{blog.authorName}</span></p>
                                <p className="text-slate-400">{new Date(blog.createdAt._seconds * 1000).toLocaleDateString()}</p>
                            </div>
                            {/* --- ADDED: Chat with Author Button (conditional) --- */}
                            {user && user.uid !== blog.authorId && (
                                <button
                                    onClick={() => router.push(`/chat/`)}
                                    className="fixed bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors right-10"
                                >
                                    Chat with Author
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {(blog.tags || []).map(tag => <span key={tag} className="text-sm bg-white/10 text-slate-200 px-2 py-1 rounded-full">{tag}</span>)}
                        </div>
                        <p className="text-slate-300 text-xl mt-6 italic">{blog.shortDescription}</p>
                    </div>

                    {/* --- NEW LAYOUT: Content and Image side-by-side --- */}
                    <div className="p-6 md:p-8 border-t border-white/20 flex flex-col lg:flex-row gap-8">
                        <div className="w-full lg:w-1/3">
                            <img src={blog.thumbnail} alt={blog.title} className="w-full h-auto object-cover rounded-lg shadow-lg"/>
                        </div>
                        <div className="w-full lg:w-2/3">
                            <div className="text-lg prose prose-invert max-w-none text-slate-200 whitespace-pre-wrap">{blog.content}</div>
                        </div>

                    </div>

                    {/* --- Comments Section --- */}
                    <div className="p-6 md:p-8 border-t border-white/20">
                        <h2 className="text-2xl font-bold mb-6">Comments ({comments.length})</h2>
                        <div className="space-y-4">
                            {comments.map(comment => (
                                <div key={comment.id} className="bg-white/5 p-4 rounded-lg">
                                    {/* --- MODIFIED: Bigger and whiter comment text --- */}
                                    <p className="text-slate-100 text-lg whitespace-pre-wrap">{comment.text}</p>
                                    <p className="text-md text-slate-400 mt-2 font-semibold">
                                        {/* MODIFIED: Display fullName */}
                                        - {commentAuthors[comment.userId] || 'Anonymous'}
                                    </p>
                                </div>
                            ))}
                            {comments.length === 0 && <p className="text-slate-400">Be the first to comment!</p>}
                        </div>
                        {user && <CommentForm blogId={blog.id} userId={user.uid} onCommentPosted={fetchBlogAndComments} />}
                    </div>
                </div>
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
                onCommentPosted();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to post comment.');
            }
        } catch (err) {
            setError('A network error occurred.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-8 border-t border-white/20 pt-6">
            <h3 className="text-xl font-semibold mb-3">Leave a Comment</h3>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share your thoughts..." className="w-full bg-black/20 text-white p-3 border border-white/20 rounded-lg h-24" required />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <button type="submit" className="mt-3 w-full bg-cyan-600 hover:bg-cyan-700 p-3 rounded-lg font-semibold">Post Comment</button>
        </form>
    );
}
