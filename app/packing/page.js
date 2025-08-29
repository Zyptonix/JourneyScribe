'use client';

import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../lib/firebaseClient'; // Adjust path if needed
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import CitySearchInput from '../../components/CitySearchInput'; // Make sure this path is correct
import NavigationBarLight from '@/components/NavigationBarLight';
import NavigationBarDark from '@/components/NavigationBarDark';

// --- ICONS ---
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;

export default function PackingAssistant() {
  // --- STATE MANAGEMENT ---
  const [destination, setDestination] = useState('');
  const [weather, setWeather] = useState('');
  const [activities, setActivities] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [user, setUser] = useState(null);
  const [packingList, setPackingList] = useState([]);
  const [newItem, setNewItem] = useState('');
  const isInitialLoad = useRef(true);
  
  // --- FIREBASE EFFECTS (Authentication & Data Sync) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setPackingList([]);
      isInitialLoad.current = true;
      return;
    }
    const loadList = async () => {
      const docRef = doc(db, "userProfiles", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().packingList) {
        setPackingList(docSnap.data().packingList);
      }
      isInitialLoad.current = false;
    };
    loadList();
  }, [user]);

  useEffect(() => {
    if (isInitialLoad.current || !user) return;
    const saveList = async () => {
      const docRef = doc(db, "userProfiles", user.uid);
      await setDoc(docRef, { packingList }, { merge: true });
    };
    saveList();
  }, [packingList, user]);

  // --- CORE FUNCTIONS ---
  const getRecommendations = async () => {
    const cityName = destination.split('(')[0].trim();
    if (!cityName || !weather) {
      setError("Please select a destination and weather.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setRecommendations([]);

    const res = await fetch("/api/packing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: cityName,
        weather,
        activities: activities.split(",").map((a) => a.trim().toLowerCase()),
      }),
    });
    
    const data = await res.json();
    setIsLoading(false);
    if (data.success) {
      setRecommendations(data.recommendations);
    } else {
      setError(data.error || "Could not fetch recommendations.");
    }
  };

  const addItemToList = (itemText) => { if (itemText && !packingList.some(item => item.text === itemText)) { setPackingList([...packingList, { id: Date.now(), text: itemText, packed: false }]); } };
  const handleManualAdd = (e) => { e.preventDefault(); addItemToList(newItem); setNewItem(""); };
  const toggleItemPacked = (itemId) => { setPackingList(packingList.map((item) => item.id === itemId ? { ...item, packed: !item.packed } : item)); };
  const removeItemFromList = (itemId) => { setPackingList(packingList.filter(item => item.id !== itemId)); };

  // --- RENDER METHOD ---
  return (
    <main className="min-h-screen w-full  text-white p-4 sm:p-8 flex items-center justify-center">
      <div className='fixed top-0 w-full'><NavigationBarDark /></div>
      <div className="fixed inset-0 h-full w-full bg-cover bg-center -z-10" style={{ backgroundImage: "url('/assets/weathercng.jpg')", filter: "blur(6px) brightness(0.4)", transform: "scale(1.05)" }}></div>
      
      <div className="w-full max-w-6xl mx-auto bg-black/30 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
        <div className="grid md:grid-cols-2 gap-8">

          {/* ====== LEFT PANEL: CONTROLS & SUGGESTIONS ====== */}
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold mb-1">Packing Assistant</h1>
            <p className="text-slate-300 mb-6">Plan your trip and we'll handle the packing list.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Destination</label>
                <CitySearchInput
                  placeholder="e.g., London"
                  value={destination}
                  onQueryChange={setDestination}
                  onCitySelect={() => { /* Can be used for other actions */ }}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Expected Weather</label>
                <select value={weather} onChange={(e) => setWeather(e.target.value)} className="w-full p-3 bg-white/20 text-white placeholder-slate-300 border border-white/30 rounded-lg focus:ring-cyan-300 focus:border-cyan-300 appearance-none">
                  <option value="" className='text-white bg-black/80'>Select Weather</option>
                  <option value="Sunny" className='text-white bg-black/80'>☀️ Sunny</option>
                  <option value="Rain" className='text-white bg-black/80'>🌧️ Rainy</option>
                  <option value="Snow" className='text-white bg-black/80'>❄️ Snowy</option>
                  <option value="Cloudy" className='text-white bg-black/80'>☁️ Cloudy</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Planned Activities</label>
                <input type="text" placeholder="hiking, swimming" value={activities} onChange={(e) => setActivities(e.target.value)} className="w-full p-3 bg-white/20 text-white placeholder-slate-300 border border-white/30 rounded-lg focus:ring-cyan-300 focus:border-cyan-300" />
              </div>
            </div>

            <button onClick={getRecommendations} disabled={isLoading} className="w-full mt-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
              {isLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : "Generate Suggestions"}
            </button>
            {error && <p className="mt-2 text-center text-red-400">{error}</p>}
            
            <hr className="border-white/10 my-6" />

            <div className="flex-grow">
              <h2 className="text-xl font-bold mb-3">Suggestions</h2>
              {recommendations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {recommendations.map((item, i) => (
                    <button key={i} onClick={() => addItemToList(item)} className="px-3 py-1 bg-white/10 text-slate-200 rounded-full hover:bg-white/20 hover:text-white transition-colors text-sm flex items-center gap-1">
                      <PlusIcon /> {item}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">Your generated suggestions will appear here.</p>
              )}
            </div>
          </div>

          {/* ====== RIGHT PANEL: PACKING CHECKLIST ====== */}
          <div className="bg-black/20 p-6 rounded-xl border border-white/10 flex flex-col">
            <h2 className="text-xl font-bold mb-4">Your Packing Checklist</h2>
            
            <form onSubmit={handleManualAdd} className="flex gap-2 mb-4">
              <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add a custom item..." className="flex-grow p-3 bg-white/10 text-white placeholder-slate-400 border border-white/20 rounded-lg focus:ring-cyan-300 focus:border-cyan-300" />
              <button type="submit" className="px-4 py-2 bg-cyan-600 font-semibold rounded-lg hover:bg-cyan-700 transition-colors">+</button>
            </form>

            <div className="flex-grow space-y-2 overflow-y-auto max-h-[50vh] pr-2">
              {!user && packingList.length > 0 && <div className="p-3 bg-amber-500/20 text-amber-200 rounded-lg text-sm">Your list is not saved. Please sign in.</div>}
              {packingList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400">Your list is empty.</div>
              ) : (
                packingList.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center">
                       <input type="checkbox" checked={item.packed} onChange={() => toggleItemPacked(item.id)} className="h-5 w-5 rounded bg-slate-700 text-cyan-500 focus:ring-cyan-500 border-slate-600 cursor-pointer" />
                       <span className={`ml-3 ${item.packed ? 'line-through text-slate-400' : ''}`}>{item.text}</span>
                    </div>
                    <button onClick={() => removeItemFromList(item.id)} className="text-slate-500 hover:text-red-400 transition-colors"><TrashIcon /></button>
                  </div>
                ))
              )}
            </div>
             <div className="text-right mt-4">
                {user ? (<p className="text-xs text-slate-400">List saved for {user.email}</p>) : (<p className="text-xs text-amber-400">Sign in to save your progress</p>)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}