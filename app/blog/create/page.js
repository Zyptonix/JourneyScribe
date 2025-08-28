'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import NavigationBarDark from '@/components/NavigationBarDark';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';

export default function CreateBlogPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [shortDescription, setShortDescription] = useState(''); // New state for the summary
    const [location, setLocation] = useState('');
    const [tags, setTags] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState(''); // <-- ADD THIS STATE

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/auth/login'); 
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleImageUpload = async () => {
        if (!imageFile) {
            setError('A thumbnail image is required.');
            return null;
        }
        
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || 'YOUR_IMGBB_API_KEY_HERE';

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (data.success) {
                return data.data.url;
            } else {
                throw new Error(data.error.message || 'Image upload failed.');
            }
        } catch (uploadError) {
            setError(`Image upload failed: ${uploadError.message}`);
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('You must be logged in to post.');
            return;
        }
        setLoading(true);
        setError('');

        const thumbnailUrl = await handleImageUpload();
        if (!thumbnailUrl) {
            setLoading(false);
            return;
        }

        const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

        try {
            const response = await fetch('/api/blogs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title, 
                    content, 
                    shortDescription, // Include short description in the API call
                    location, 
                    thumbnail: thumbnailUrl,
                    tags: tagsArray,
                    authorId: user.uid 
                }),
            });
            if (response.ok) {
                router.push('/blog'); 
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
    useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => { // Make the callback async
        if (currentUser) {
            setUser(currentUser);

            // --- ADDED: Fetch user profile ---
            const docRef = doc(db, 'userProfiles', currentUser.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Assuming the field in your document is named 'username'
                setUsername(docSnap.data().fullName);
            } else {
                // Fallback to email if no profile/username exists
                setUsername(currentUser.email);
            }
            // --- END ADDED ---

        } else {
            router.push('/auth/login');
        }
    });
    return () => unsubscribe();
}, [router]);
    const inputStyles = "w-full bg-black/20 text-white placeholder-slate-300 p-3 border border-white/20 rounded-lg shadow-[inset_0_0_0_1000px_rgba(0,0,0,0.2)] focus:ring-cyan-400 focus:border-cyan-400";

    if (!user) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen font-inter text-white">
            <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/assets/blog.jpg')" }}></div>
            <div className="fixed inset-0 -z-10 bg-black/60"></div>
            <NavigationBarDark />
            <main className="p-4 md:p-8 max-w-7xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-black/30 backdrop-blur-xl rounded-xl shadow-lg p-8 border border-white/20">
                        <h1 className="text-4xl font-extrabold text-center text-white mb-6">Create Your Story</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input id="title" type="text" placeholder="Blog Title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputStyles} required />
                            <input id="location" type="text" placeholder="Location (e.g., Paris, France)" value={location} onChange={(e) => setLocation(e.target.value)} className={inputStyles} required />
                            <input id="thumbnail" type="file" accept="image/*" onChange={handleImageChange} className={`${inputStyles} p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30`} required />
                            <input id="tags" type="text" placeholder="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} className={inputStyles} required />
                        </div>
                         <div className="mt-6">
                            <label htmlFor="shortDescription" className="block text-sm font-medium text-slate-200 mb-1">Short Description (for previews)</label>
                            <textarea id="shortDescription" placeholder="A brief summary of your adventure..." value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className={`${inputStyles} h-24`} required />
                        </div>
                    </div>

                    <div className="bg-black/30 backdrop-blur-xl rounded-xl shadow-lg p-8 border border-white/20">
                        <h2 className="text-2xl font-bold text-white mb-4">Live Preview</h2>
                        <div className="flex flex-col md:flex-row gap-8 w-[50vw]">
                            <div className="w-full md:w-1/2">
                                <img src={imagePreview || 'https://placehold.co/600x600/000000/FFFFFF?text=Your+Image'} alt="Thumbnail Preview" className="w-full h-auto object-cover rounded-lg aspect-square" />
                            </div>
                            <div className="w-full md:w-2/3">
                                <p className="text-cyan-400 font-semibold">{location || 'Location'}</p>
                                <h3 className="text-3xl font-extrabold text-white mt-2">{title || 'Your Blog Title'}</h3>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {tags.split(',').map(tag => tag.trim()).filter(tag => tag).map(tag => (
                                        <span key={tag} className="text-xs bg-white/10 text-slate-200 px-2 py-1 rounded-full">{tag}</span>
                                    ))}
                                </div>
                                <p className="text-slate-300 mt-4 text-md italic">{shortDescription || 'Your short description will appear here...'}</p>
                                <div className="mt-4 text-sm text-slate-400">
                                    <p>by <span className="font-semibold text-slate-200">{username || 'Author Name'}</span></p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 border-t border-white/20 pt-6">
                             <label htmlFor="content" className="block text-sm font-medium text-slate-200 mb-1">Your Full Story</label>
                            <textarea id="content" placeholder="Tell us all about your trip..." value={content} onChange={(e) => setContent(e.target.value)} className={`${inputStyles} h-48`} required />
                        </div>
                    </div>
                    
                    {error && <p className="text-red-400 text-center p-3 bg-red-500/20 rounded-lg">{error}</p>}
                    <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 rounded-lg font-bold text-lg hover:from-blue-600 hover:to-cyan-600 transition-colors" disabled={loading}>
                        {loading ? 'Publishing...' : 'Publish Story'}
                    </button>
                </form>
            </main>
        </div>
    );
}
