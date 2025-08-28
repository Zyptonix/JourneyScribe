'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { openDB } from 'idb';
import { auth, db } from '@/lib/firebaseClient.js';
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, addDoc, collection, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';

// Database and stores for IndexedDB
const DB_NAME = 'TripManagementDB';
const DOCUMENTS_STORE = 'documents';
const NOTES_STORE = 'notes';
const DB_VERSION = 1;

// Global variables provided by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null

// Helper function to open and create the IndexedDB database
const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
        db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
      }
    },
  });
};

const TripDocumentsAndNotes = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [userId, setUserId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [tripPosts, setTripPosts] = useState([]);
  const [tripLocation, setTripLocation] = useState('');
  const [tripDuration, setTripDuration] = useState('');
  const [tripImage, setTripImage] = useState(null);
  const [isPosting, setIsPosting] = useState(false);

  // --- Firebase Authentication and Data Loading (Firestore & IndexedDB) ---
  useEffect(() => {
    if (!auth || !db) return;

    const authenticate = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        }
      } catch (error) {
        console.error('Error signing in:', error);
      }
    };
    authenticate();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

        const postsCollection = collection(db, `artifacts/${appId}/public/data/trips`);
        const unsubscribePosts = onSnapshot(postsCollection, (snapshot) => {
          const postsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          postsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setTripPosts(postsData);
        }, (error) => {
          console.error("Error fetching trip posts:", error);
        });

        const loadLocalData = async () => {
          const idb = await initDB();
          const tx = idb.transaction([DOCUMENTS_STORE, NOTES_STORE], 'readonly');
          const allDocs = await tx.objectStore(DOCUMENTS_STORE).getAll();
          const allNotes = await tx.objectStore(NOTES_STORE).getAll();

          const displayDocs = allDocs.map(doc => ({
            ...doc,
            url: URL.createObjectURL(new Blob([doc.file], { type: 'application/pdf' })),
          }));

          setDocuments(displayDocs);
          setNotes(allNotes);
        };
        loadLocalData();

        return () => {
          unsubscribePosts();
          documents.forEach(doc => {
            if (doc.url && doc.url.startsWith('blob:')) URL.revokeObjectURL(doc.url);
          });
        };
      } else {
        setUserId(null);
        setTripPosts([]);
      }
    });

    return () => unsubscribeAuth();
  }, [auth, db]);


  // --- IndexedDB Logic (Existing) ---
  const handleAddDocument = async () => {
    if (!selectedFile) return;
    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      const idb = await initDB();
      const tx = idb.transaction(DOCUMENTS_STORE, 'readwrite');
      const store = tx.objectStore(DOCUMENTS_STORE);
      const newDoc = {
        id: Date.now().toString(),
        name: selectedFile.name,
        size: selectedFile.size,
        file: event.target.result,
      };
      await store.add(newDoc);
      await tx.done;
      setDocuments((prev) => [
        ...prev,
        {
          ...newDoc,
          url: URL.createObjectURL(new Blob([newDoc.file], { type: 'application/pdf' })),
        },
      ]);
      setSelectedFile(null);
    };
    fileReader.readAsArrayBuffer(selectedFile);
  };

  const handleDeleteDocument = async (id) => {
    const idb = await initDB();
    const tx = idb.transaction(DOCUMENTS_STORE, 'readwrite');
    const store = tx.objectStore(DOCUMENTS_STORE);
    await store.delete(id);
    await tx.done;
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const idb = await initDB();
    const tx = idb.transaction(NOTES_STORE, 'readwrite');
    const store = tx.objectStore(NOTES_STORE);
    const newNoteObject = {
      id: Date.now().toString(),
      text: newNote,
    };
    await store.add(newNoteObject);
    await tx.done;
    setNotes((prev) => [...prev, newNoteObject]);
    setNewNote('');
  };

  const handleDeleteNote = async (id) => {
    const idb = await initDB();
    const tx = idb.transaction(NOTES_STORE, 'readwrite');
    const store = tx.objectStore(NOTES_STORE);
    await store.delete(id);
    await tx.done;
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  // --- Firestore Logic with ImgBB upload ---
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!tripLocation || !tripDuration || !tripImage || !userId) return;

    setIsPosting(true);
    try {
      let imageUrl = '';
      const imgbbApiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

      if (!imgbbApiKey) {
        throw new Error("ImgBB API key is not configured. Please set NEXT_PUBLIC_IMGBB_API_KEY in your environment variables.");
      }

      const formData = new FormData();
      formData.append('image', tripImage);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        imageUrl = data.data.url;
      } else {
        throw new Error(data.error.message || "Failed to upload image to ImgBB.");
      }

      let username = 'Anonymous';
      try {
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}`);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          username = userDocSnap.data().username || 'Anonymous';
        }
      } catch (err) {
        console.warn("No profile found, defaulting to Anonymous");
      }

      const newPost = {
        userId,
        username,
        location: tripLocation,
        duration: tripDuration,
        imageUrl,
        requests: [],
        createdAt: Date.now(),
      };

      const postsCollection = collection(db, `artifacts/${appId}/public/data/trips`);
      await addDoc(postsCollection, newPost);

      setTripLocation('');
      setTripDuration('');
      setTripImage(null);
      document.getElementById('image-upload-input').value = '';
    } catch (error) {
      console.error('Error creating trip post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleRequestToJoin = async (postId) => {
    if (!userId) return;

    try {
      const postRef = doc(db, `artifacts/${appId}/public/data/trips`, postId);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        const postData = postSnap.data();
        if (!postData.requests.includes(userId)) {
          const updatedRequests = [...postData.requests, userId];
          await updateDoc(postRef, {
            requests: updatedRequests,
          });
        }
      }
    } catch (error) {
      console.error('Error requesting to join trip:', error);
    }
  };


  return (
    <Suspense>
      <div
        className="fixed inset-0 -z-10 h-full w-full bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/traveldocs.png')" }}
      ></div>
      <div className="fixed inset-x-0 top-0 h-[100vh] bg-gradient-to-b from-black to-blue-800 opacity-40"></div>

      <div className="min-h-screen font-inter flex flex-col pt-20 relative z-10">
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-black/30 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/30 text-white">
            <h1 className="text-4xl font-extrabold text-center text-white mb-2">
              Trip Management ✈︎
            </h1>
            <p className="text-center text-white/80 mb-6">
              Manage your travel documents, notes, and share trip posts with others!
            </p>

            <div className="text-center text-sm mb-8">
              <p>Your User ID: <span className="font-mono bg-black/20 p-1 rounded-md">{userId || 'Connecting...'}</span></p>
            </div>

            <div className="flex justify-center mb-10 gap-8 flex-wrap">
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-10 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === 'documents'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/30 text-white hover:bg-white/40 border border-white/20'
                  }`}
              >
                My Documents
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-10 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === 'notes'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/30 text-white hover:bg-white/40 border border-white/20'
                  }`}
              >
                My Notes
              </button>
              <button
                onClick={() => setActiveTab('trips')}
                className={`px-10 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === 'trips'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/30 text-white hover:bg-white/40 border border-white/20'
                  }`}
              >
                Trip Posts
              </button>
            </div>

            {activeTab === 'documents' && (
              <div className="space-y-8 p-6 rounded-lg bg-white/10 shadow-lg border border-white/20">
                <h2 className="text-2xl font-bold text-white border-b border-white/20 pb-2">
                  Store Your Documents
                </h2>
                <p className="text-sm text-blue-400 italic mb-4">
                  Note: These documents are stored locally on your browser. They won’t
                  sync across devices.
                </p>

                <div className="p-4 bg-white/10 rounded-lg border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Upload a New Document
                  </h3>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 transition-colors duration-200"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-white/70">
                      Selected file: {selectedFile.name}
                    </p>
                  )}

                  <button
                    onClick={handleAddDocument}
                    className="mt-4 w-full bg-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-md disabled:bg-gray-400"
                    disabled={!selectedFile}
                  >
                    Save Locally
                  </button>
                </div>

                <h3 className="text-2xl font-bold text-white border-b border-white/20 pb-2 mt-8">
                  Your Saved Documents
                </h3>
                <div className="space-y-4">
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 border border-white/20 rounded-lg shadow-sm bg-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-8 w-8 text-red-400"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 4h7v5h5v11H6V4z" />
                          </svg>
                          <p className="font-semibold text-lg text-white">
                            {doc.name}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors duration-200"
                          >
                            View PDF
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="ml-4 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-8">
                      No documents stored yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-8 p-6 rounded-lg bg-white/10 shadow-lg border border-white/20">
                <h2 className="text-2xl font-bold text-white border-b border-white/20 pb-2">
                  Your Trip Notes
                </h2>
                <div className="p-4 bg-white/10 rounded-lg border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Add a New Note
                  </h3>
                  <textarea
                    className="w-full h-32 p-4 rounded-lg border-2 border-white/30 bg-white/5 focus:outline-none focus:border-green-400 transition-colors duration-200 resize-none placeholder-white/50 text-white"
                    placeholder="Jot down some quick notes about your trip..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  ></textarea>
                  <button
                    onClick={handleAddNote}
                    className="mt-4 w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 transition-colors duration-200 shadow-md disabled:bg-gray-400"
                    disabled={!newNote.trim()}
                  >
                    Save Note
                  </button>
                </div>
                <h3 className="text-2xl font-bold text-white border-b border-white/20 pb-2 mt-8">
                  All Notes
                </h3>
                <div className="space-y-4">
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-4 border border-white/20 rounded-lg shadow-sm bg-white/5 flex items-start justify-between"
                      >
                        <p className="text-sm text-white whitespace-pre-wrap w-full pr-4">
                          {note.text}
                        </p>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="ml-4 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-8">No notes stored yet.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'trips' && (

              <div className="space-y-8 p-6 rounded-lg bg-white/10 shadow-lg border border-white/20">
                <h2 className="text-2xl font-bold text-white border-b border-white/20 pb-2">
                  Shared Trip Posts
                </h2>

                <form
                  onSubmit={handleCreatePost}
                  className="p-6 rounded-lg bg-white/10 border border-white/20 space-y-4"
                >
                  <h3 className="text-lg font-semibold text-white">Create a New Post</h3>
                  <input
                    type="text"
                    placeholder="Trip Location (e.g., Paris, France)"
                    value={tripLocation}
                    onChange={(e) => setTripLocation(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/5 text-white placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-blue-400 transition-colors duration-200"
                  />
                  <input
                    type="text"
                    placeholder="Duration (e.g., 7 days, 2 weeks)"
                    value={tripDuration}
                    onChange={(e) => setTripDuration(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/5 text-white placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-blue-400 transition-colors duration-200"
                  />
                  <input
                    type="file"
                    id="image-upload-input"
                    accept="image/*"
                    onChange={(e) => setTripImage(e.target.files[0])}
                    className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600 transition-colors duration-200"
                  />
                  {tripImage && (
                    <p className="mt-2 text-sm text-white/70">
                      Selected file: {tripImage.name}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-md disabled:bg-gray-400"
                    disabled={isPosting || !tripLocation || !tripDuration || !tripImage}
                  >
                    {isPosting ? 'Posting...' : 'Create Post'}
                  </button>
                </form>

                <h3 className="text-2xl font-bold text-white border-b border-white/20 pb-2 mt-8">
                  All Shared Trips
                </h3>
                <div className="space-y-6">
                  {tripPosts.length > 0 ? (
                    tripPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-6 rounded-lg shadow-xl bg-white/10 border border-white/20 overflow-hidden"
                      >
                        <img
                          src={post.imageUrl}
                          alt={`Trip to ${post.location}`}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xl font-bold text-white">{post.location}</p>
                            <p className="text-sm text-white/80">{post.duration}</p>
                          </div>
                          <span className="text-xs bg-white/10 text-white px-2 py-1 rounded-full">
                            Posted by: {post.username}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <button
                            onClick={() => handleRequestToJoin(post.id)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${post.requests.includes(userId)
                                ? 'bg-green-500 text-white'
                                : 'bg-green-600 text-white hover:bg-green-700'
                              } disabled:bg-gray-400`}
                            disabled={post.requests.includes(userId)}
                          >
                            {post.requests.includes(userId) ? 'Request Sent' : 'Request to Join'}
                          </button>
                          {post.requests.length > 0 && (
                            <span className="text-sm text-white/70">
                              {post.requests.length} request{post.requests.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-8">
                      No shared trips found. Create one to get started!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Suspense>
  );
};

export default TripDocumentsAndNotes;