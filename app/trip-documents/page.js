'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { openDB } from 'idb';
import { auth, db } from '@/lib/firebaseClient.js';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import NavigationBarLight from '@/components/NavigationBarLight';
import NavigationBarDark from '@/components/NavigationBarDark';

// --- IndexedDB Configuration ---
const DB_NAME = 'TripManagementDB';
const DOCUMENTS_STORE = 'documents';
const NOTES_STORE = 'notes';
const DB_VERSION = 1;

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

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

// --- Main Component ---
const TripDocumentsAndNotes = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [userId, setUserId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [itinerary, setItinerary] = useState([]); // To link documents to events

  useEffect(() => {
    if (!auth || !db) return;

    const authenticateAndLoad = async (user) => {
        setUserId(user.uid);

        // --- Load Itinerary for linking ---
        const itineraryDocRef = doc(db, "artifacts", "itinerary-builder-app", "users", user.uid, "currentItinerary", "main");
        onSnapshot(itineraryDocRef, (doc) => {
            if (doc.exists()) {
                setItinerary(doc.data().events || []);
            }
        });

        // --- Load Local Data from IndexedDB ---
        const idb = await initDB();
        const allDocs = await idb.getAll(DOCUMENTS_STORE);
        const allNotes = await idb.getAll(NOTES_STORE);

        const displayDocs = allDocs.map(doc => ({
            ...doc,
            url: URL.createObjectURL(new Blob([doc.file], { type: doc.fileType })),
        }));

        setDocuments(displayDocs);
        setNotes(allNotes);

        // Cleanup blob URLs on component unmount
        return () => {
            displayDocs.forEach(doc => {
                if (doc.url && doc.url.startsWith('blob:')) URL.revokeObjectURL(doc.url);
            });
        };
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            authenticateAndLoad(user);
        } else if (initialAuthToken) {
            try {
                const userCredential = await signInWithCustomToken(auth, initialAuthToken);
                authenticateAndLoad(userCredential.user);
            } catch (error) {
                console.error('Error signing in with custom token:', error);
            }
        } else {
            // Handle case where there is no user and no token
             signInAnonymously(auth);
        }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <Suspense>
      <div className="fixed inset-0 -z-10 h-full w-full bg-cover bg-center" style={{ backgroundImage: "url('/assets/traveldocs.png')" }} />
      <div className="fixed inset-x-0 top-0 h-[100vh] bg-gradient-to-b from-black to-blue-800 opacity-40" />
      <div className='relative top-0'><NavigationBarDark /></div>
      <div className="min-h-80vh font-inter flex flex-col relative z-10">
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-black/30 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/30 text-white">
            <h1 className="text-4xl font-extrabold text-center text-white mb-2">Trip Management ✈︎</h1>
            <p className="text-center text-white/80 mb-6">Manage your travel documents and notes for quick access on the go.</p>

            <div className="flex justify-center mb-10 gap-8 flex-wrap">
              <button onClick={() => setActiveTab('documents')} className={`px-10 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === 'documents' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/30 text-white hover:bg-white/40 border border-white/20'}`}>
                My Documents
              </button>
              <button onClick={() => setActiveTab('notes')} className={`px-10 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === 'notes' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/30 text-white hover:bg-white/40 border border-white/20'}`}>
                My Notes
              </button>
            </div>

            {activeTab === 'documents' && <DocumentsTab documents={documents} setDocuments={setDocuments} itinerary={itinerary} />}
            {activeTab === 'notes' && <NotesTab notes={notes} setNotes={setNotes} />}
          </div>
        </div>
      </div>
    </Suspense>
  );
};

// --- Documents Tab Component ---
const DocumentsTab = ({ documents, setDocuments, itinerary }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [docName, setDocName] = useState('');
    const [docDesc, setDocDesc] = useState('');
    const [linkedEventId, setLinkedEventId] = useState('');

    const handleAddDocument = async () => {
        if (!selectedFile || !docName) {
            alert("Please select a file and provide a name for it.");
            return;
        }
        const fileReader = new FileReader();
        fileReader.onload = async (event) => {
            const idb = await initDB();
            const newDoc = {
                id: Date.now().toString(),
                name: docName,
                description: docDesc,
                linkedEventId: linkedEventId,
                originalFileName: selectedFile.name,
                file: event.target.result,
                fileType: selectedFile.type,
            };
            await idb.add(DOCUMENTS_STORE, newDoc);
            setDocuments((prev) => [
                ...prev,
                { ...newDoc, url: URL.createObjectURL(new Blob([newDoc.file], { type: newDoc.fileType })) },
            ]);
            setSelectedFile(null);
            setDocName('');
            setDocDesc('');
            setLinkedEventId('');
            document.getElementById('doc-upload-input').value = '';
        };
        fileReader.readAsArrayBuffer(selectedFile);
    };

    const handleDeleteDocument = async (id) => {
        await (await initDB()).delete(DOCUMENTS_STORE, id);
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    };

    return (
        <div className="space-y-8 p-6 rounded-lg bg-white/10 shadow-lg border border-white/20">
            <div className="p-4 bg-white/10 rounded-lg border border-white/20 space-y-4">
                <h3 className="text-lg font-semibold text-white">Upload a New Document</h3>
                <input type="text" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Document Name (e.g., Flight Ticket)" className="w-full p-3 rounded-lg bg-black/40 text-white placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-blue-400" />
                <textarea value={docDesc} onChange={(e) => setDocDesc(e.target.value)} placeholder="Short Description (optional)" className="w-full h-20 p-3 rounded-lg bg-black/40 text-white placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-blue-400 resize-none" />
                <select value={linkedEventId} onChange={(e) => setLinkedEventId(e.target.value)} className="w-full p-3 rounded-lg bg-black/40 text-white border-2 border-white/30 focus:outline-none focus:border-blue-400">
                    <option value="">(Optional) Link to an itinerary event</option>
                    {itinerary.map(event => <option key={event.id} value={event.id}>{event.name} @ {event.time}</option>)}
                </select>
                <input id="doc-upload-input" type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600" />
                <button onClick={handleAddDocument} className="w-full bg-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-600 shadow-md disabled:bg-gray-500" disabled={!selectedFile || !docName}>Save Locally</button>
            </div>
            <div className="space-y-4">
                {documents.length > 0 ? (
                    documents.map((doc) => {
                        const linkedEvent = itinerary.find(e => e.id === doc.linkedEventId);
                        return (
                            <div key={doc.id} className="p-4 border border-white/20 rounded-lg shadow-sm bg-white/5 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-lg text-white">{doc.name}</p>
                                    <p className="text-sm text-white/70">{doc.description}</p>
                                    {linkedEvent && <p className="text-xs text-blue-400 mt-1">Linked to: {linkedEvent.name}</p>}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600">View</a>
                                    <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600">✕</button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-white/60 text-center py-8">No documents stored yet.</p>
                )}
            </div>
        </div>
    );
};

// --- Notes Tab Component ---
const NotesTab = ({ notes, setNotes }) => {
    const [newNote, setNewNote] = useState({ title: '', text: '' });

    const handleAddNote = async () => {
        if (!newNote.title.trim() || !newNote.text.trim()) return;
        const idb = await initDB();
        const newNoteObject = { id: Date.now().toString(), ...newNote };
        await idb.add(NOTES_STORE, newNoteObject);
        setNotes((prev) => [...prev, newNoteObject]);
        setNewNote({ title: '', text: '' });
    };

    const handleDeleteNote = async (id) => {
        await (await initDB()).delete(NOTES_STORE, id);
        setNotes((prev) => prev.filter((note) => note.id !== id));
    };

    return (
        <div className="space-y-8 p-6 rounded-lg bg-white/10 shadow-lg border border-white/20">
            <div className="p-4 bg-white/10 rounded-lg border border-white/20 space-y-4">
                <h3 className="text-lg font-semibold text-white">Add a New Note</h3>
                <input type="text" value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} placeholder="Note Title" className="w-full p-3 rounded-lg bg-white/5 text-white placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-green-400" />
                <textarea value={newNote.text} onChange={(e) => setNewNote({ ...newNote, text: e.target.value })} placeholder="Jot down some quick notes..." className="w-full h-32 p-3 rounded-lg bg-white/5 text-white placeholder-white/50 border-2 border-white/30 focus:outline-none focus:border-green-400 resize-none" />
                <button onClick={handleAddNote} className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 shadow-md disabled:bg-gray-500" disabled={!newNote.title.trim() || !newNote.text.trim()}>Save Note</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {notes.length > 0 ? (
                    notes.map((note) => (
                        <div key={note.id} className="p-4 border border-white/20 rounded-lg shadow-sm bg-white/5 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-lg text-white pr-4">{note.title}</h4>
                                <button onClick={() => handleDeleteNote(note.id)} className="p-2 -mt-2 -mr-2 rounded-full text-white/50 hover:bg-red-500 hover:text-white flex-shrink-0">✕</button>
                            </div>
                            <p className="text-sm text-white/80 whitespace-pre-wrap flex-grow">{note.text}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-white/60 text-center py-8 md:col-span-2">No notes stored yet.</p>
                )}
            </div>
        </div>
    );
};

export default TripDocumentsAndNotes;
