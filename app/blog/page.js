'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import NavigationBarDark from '@/components/NavigationBarDark';

// --- Main Blog Page Component ---
export default function BlogPage() {
    const router = useRouter();
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [expandedBlogId, setExpandedBlogId] = useState(null);
    const [popularBlogIndex, setPopularBlogIndex] = useState(0);
    const [activeTag, setActiveTag] = useState(null);
    const [filter, setFilter] = useState('');
    const allBlogsRef = useRef(null);

    const fetchBlogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/blogs');
            const data = await response.json();
            if (response.ok) setBlogs(data);
            else setError(data.error || 'Failed to fetch blogs.');
        } catch (err) {
            setError('A network error occurred.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        fetchBlogs();
        return () => unsubscribe();
    }, [fetchBlogs]);

    const popularBlogs = useMemo(() => 
        [...blogs].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 3),
    [blogs]);

    const filteredBlogs = useMemo(() => {
        let filtered = blogs;
        if (activeTag) {
            filtered = filtered.filter(blog => (blog.tags || []).includes(activeTag));
        }
        if (filter) {
            filtered = filtered.filter(blog => 
                blog.location.toLowerCase().includes(filter.toLowerCase()) || 
                blog.title.toLowerCase().includes(filter.toLowerCase())
            );
        }
        return filtered;
    }, [activeTag, filter, blogs]);

    const scrollToAllBlogs = () => allBlogsRef.current?.scrollIntoView({ behavior: 'smooth' });

    const changePopularBlog = (direction) => {
        setPopularBlogIndex(prev => {
            const newIndex = prev + direction;
            if (newIndex < 0) return popularBlogs.length - 1;
            if (newIndex >= popularBlogs.length) return 0;
            return newIndex;
        });
    };

    const handleTagClick = (tag) => {
        setActiveTag(tag);
        scrollToAllBlogs();
    };

    return (
        <div className="min-h-screen font-inter text-white">
            <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/assets/blog.jpg')" }}></div>
            <div className="fixed inset-0 -z-10 bg-black/60"></div>
            <NavigationBarDark />

            <header className="h-screen flex flex-col justify-center p-4 relative overflow-hidden">
                <div className="absolute top-15 left-0 right-0 px-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-5xl md:text-6xl font-extrabold text-white">Travel Chronicles</h1>
                        <p className="text-slate-200 mt-2 text-lg">Adventures and stories from around the globe.</p>
                    </div>
                    {user && <button onClick={() => router.push('/blog/create')} className="bg-cyan-600 hover:bg-cyan-700 px-6 py-3 rounded-lg font-semibold transition-transform hover:scale-105 self-start whitespace-nowrap">+ Share Your Story</button>}
                </div>

                <div className="relative w-[1200px] mx-auto h-[500px]">
                    {popularBlogs.map((blog, index) => (
                        <FeaturedBlogCard 
                            key={blog.id} 
                            blog={blog} 
                            index={index}
                            popularBlogIndex={popularBlogIndex}
                            totalPopular={popularBlogs.length}
                            onTagClick={handleTagClick}
                        />
                    ))}
                </div>
                
                <button onClick={() => changePopularBlog(-1)} className="absolute left-4 md:left-24 top-1/2 -translate-y-1/2 bg-black/30 p-2 rounded-full hover:bg-black/50 z-10"><svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <button onClick={() => changePopularBlog(1)} className="absolute right-4 md:right-24 top-1/2 -translate-y-1/2 bg-black/30 p-2 rounded-full hover:bg-black/50 z-10"><svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                
                <button onClick={scrollToAllBlogs} className="absolute bottom-27 left-1/2 -translate-x-1/2 animate-bounce"><svg className="w-10 h-10 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
            </header>

            <main ref={allBlogsRef} className="p-4 md:p-8 max-w-7xl mx-auto">
                <section>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold mb-4 md:mb-0">All Stories {activeTag && <span className="text-cyan-400 font-normal">tagged with "{activeTag}"</span>}</h2>
                        <div className="relative w-full max-w-md">
                            <input
                                type="text"
                                placeholder="Search by title or location..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-full py-3 pl-6 pr-12"
                            />
                            <svg className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    {loading && <p className="text-center">Loading...</p>}
                    {error && <p className="text-center text-red-400">{error}</p>}
                    {!loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredBlogs.map(blog => <BlogCard key={blog.id} blog={blog} isExpanded={expandedBlogId === blog.id} onExpand={setExpandedBlogId} />)}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

// --- Featured Blog Card for Hero Section ---
function FeaturedBlogCard({ blog, index, popularBlogIndex, totalPopular, onTagClick }) {
    const router = useRouter();
    const position = (index - popularBlogIndex + totalPopular) % totalPopular;

    const styles = [
        { transform: 'scale(1) translateY(0)', zIndex: 30, opacity: 1 },
        { transform: 'scale(0.9) translateY(40px)', zIndex: 20, opacity: 1 },
        { transform: 'scale(0.8) translateY(80px)', zIndex: 10, opacity: 1 },
    ];

    const style = styles[position] || { transform: 'scale(0.7)', opacity: 0, zIndex: 0 };

    return (
        <div className="absolute inset-0 w-full h-full transition-all duration-700 ease-in-out" style={style}>
            <div className="w-full h-full bg-black/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col md:flex-row mx-auto">
                <img src={blog.thumbnail || 'https://placehold.co/600x550'} alt={blog.title} className="w-full md:w-1/2 h-64 md:h-full object-cover" />
                <div className="p-8 flex flex-col justify-center">
                    <p className="text-cyan-400 font-semibold">{blog.location}</p>
                    <h2 className="text-4xl font-extrabold text-white mt-2">{blog.title}</h2>
                    <div className="flex flex-wrap gap-2 mt-4">
                        {(blog.tags || []).map(tag => (
                            <button key={tag} onClick={() => onTagClick(tag)} className="text-xs bg-white/10 text-slate-200 px-2 py-1 rounded-full hover:bg-white/20 transition-colors">{tag}</button>
                        ))}
                    </div>
                    <p className="text-slate-300 mt-4 text-md line-clamp-4">{blog.content}</p>
                    <div className="mt-6"><button onClick={() => router.push(`/blog/${blog.id}`)} className="bg-cyan-600 hover:bg-cyan-700 px-6 py-3 rounded-lg font-semibold">Read Full Story</button></div>
                </div>
            </div>
        </div>
    );
}

// --- Expandable Blog Card for All Stories Section ---
function BlogCard({ blog, isExpanded, onExpand }) {
    const router = useRouter();
    const { title, location, thumbnail, tags, content } = blog;

    return (
        <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'md:col-span-2 lg:col-span-3' : ''}`}>
            <div 
                className="bg-black/20 backdrop-blur-md rounded-xl border border-white/20 flex flex-col overflow-hidden h-full cursor-pointer"
                onClick={!isExpanded ? () => onExpand(blog.id) : undefined}
            >
                {!isExpanded ? (
                    <>
                        <img src={thumbnail || 'https://placehold.co/400x200'} alt={title} className="w-full h-40 object-cover" />
                        <div className="p-6 flex-grow flex flex-col">
                            <p className="text-sm text-cyan-400 font-semibold">{location}</p>
                            <h3 className="text-xl font-bold mt-1 text-white">{title}</h3>
                            <div className="mt-auto pt-4">
                                <span className="font-semibold text-sm text-cyan-300 group-hover:underline">Click to expand &rarr;</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col md:flex-row cursor-default">
                        <img src={thumbnail || 'https://placehold.co/600x400'} alt={title} className="w-full md:w-1/3 h-48 md:h-auto object-cover" />
                        <div className="p-6 flex-grow flex flex-col">
                            <p className="text-sm text-cyan-400 font-semibold">{location}</p>
                            <h3 className="text-2xl font-bold mt-1 text-white">{title}</h3>
                            <div className="flex flex-wrap gap-2 mt-3">{(tags || []).map(tag => <span key={tag} className="text-xs bg-white/10 text-slate-200 px-2 py-1 rounded-full">{tag}</span>)}</div>
                            <p className="text-slate-300 mt-3 text-sm line-clamp-4 flex-grow">{content}</p>
                            <div className="mt-4 flex gap-4">
                                <button onClick={() => router.push(`/blog/${blog.id}`)} className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg font-semibold text-sm">Read Full Story</button>
                                <button onClick={() => onExpand(null)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold text-sm">Collapse</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
