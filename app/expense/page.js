'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { openDB } from 'idb';
import { auth } from '@/lib/firebaseClient';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import NavigationBarDark from '@/components/NavigationBarDark';
import { PlusIcon, TrashIcon, CurrencyDollarIcon, TagIcon, CalendarIcon } from '@heroicons/react/24/solid';

// --- IndexedDB Configuration ---
const DB_NAME = 'ExpenseTrackerDB';
const EXPENSES_STORE = 'expenses';
const DB_VERSION = 1;

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(EXPENSES_STORE)) {
        db.createObjectStore(EXPENSES_STORE, { keyPath: 'id' });
      }
    },
  });
};

// --- Main Component ---
const ExpenseTrackerPage = () => {
    const [userId, setUserId] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [newExpense, setNewExpense] = useState({ name: '', amount: '', category: 'Food', currency: 'USD' });
    const [loading, setLoading] = useState(true);

    // --- Authentication and Data Loading ---
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            let finalUser = user;
            if (!finalUser && initialAuthToken) {
                try {
                    const userCredential = await signInWithCustomToken(auth, initialAuthToken);
                    finalUser = userCredential.user;
                } catch (error) {
                    console.error('Error signing in with custom token:', error);
                    finalUser = await signInAnonymously(auth);
                }
            } else if (!finalUser) {
                finalUser = await signInAnonymously(auth);
            }
            
            setUserId(finalUser.uid);
            
            const idb = await initDB();
            const allExpenses = await idb.getAll(EXPENSES_STORE);
            setExpenses(allExpenses);
            setLoading(false);
        });

        return () => unsubscribeAuth();
    }, []);

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!newExpense.name || !newExpense.amount) {
            alert("Please provide an expense name and amount.");
            return;
        }
        const idb = await initDB();
        const expenseToAdd = {
            id: Date.now().toString(),
            name: newExpense.name,
            amount: parseFloat(newExpense.amount),
            category: newExpense.category,
            currency: newExpense.currency,
            createdAt: new Date().toISOString(), // Save current date and time
        };
        await idb.add(EXPENSES_STORE, expenseToAdd);
        setExpenses((prev) => [...prev, expenseToAdd]);
        setNewExpense({ name: '', amount: '', category: 'Food', currency: 'USD' });
    };

    const handleDeleteExpense = async (id) => {
        const idb = await initDB();
        await idb.delete(EXPENSES_STORE, id);
        setExpenses((prev) => prev.filter((exp) => exp.id !== id));
    };

    const calculateTotalsByCurrency = () => {
        return expenses.reduce((acc, exp) => {
            acc[exp.currency] = (acc[exp.currency] || 0) + exp.amount;
            return acc;
        }, {});
    };

    const totalExpensesByCurrency = calculateTotalsByCurrency();
    const expenseCategories = ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other'];
    const currencyOptions = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'BDT': '৳'
    };

    return (
        <Suspense>
            <div className="fixed inset-0 -z-10 h-full w-full bg-cover bg-center" style={{ backgroundImage: "url('/assets/expenses.jpg')" }} />
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm -z-10" />
            <NavigationBarDark />

            <div className="min-h-screen font-inter flex flex-col items-center pt-24 pb-12 px-4 relative z-10 text-white">
                <div className="w-full max-w-7xl mx-auto">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-center mb-4 text-shadow-lg">Expense Tracker</h1>
                    <p className="text-center text-white/80 mb-12">Keep a detailed record of your spending on the go.</p>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Add Expense & Summary */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-28 space-y-8">
                                {/* Add Expense Form */}
                                <div className="backdrop-blur-xl bg-black/30 rounded-2xl p-8 border border-white/20 shadow-2xl">
                                    <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                        <PlusIcon className="h-8 w-8 text-green-400" /> Add Expense
                                    </h2>
                                    <form onSubmit={handleAddExpense} className="space-y-4">
                                        <input type="text" value={newExpense.name} onChange={(e) => setNewExpense({...newExpense, name: e.target.value})} placeholder="Expense Name" required className="w-full p-4 text-lg bg-white/10 border-2 border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" />
                                        <div className="flex gap-4">
                                            <div className="relative flex-grow"><CurrencyDollarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/40" /><input type="number" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} placeholder="Amount" required className="w-full p-4 pl-12 text-lg bg-white/10 border-2 border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" /></div>
                                            <select value={newExpense.currency} onChange={(e) => setNewExpense({...newExpense, currency: e.target.value})} className="p-4 text-lg bg-white/10 border-2 border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400">
                                                {Object.keys(currencyOptions).map(curr => <option key={curr} value={curr} className="bg-gray-800">{curr}</option>)}
                                            </select>
                                        </div>
                                        <div className="relative"><TagIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/40" />
                                            <select value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} className="w-full p-4 pl-12 text-lg bg-white/10 border-2 border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400">
                                                {expenseCategories.map(cat => <option key={cat} value={cat} className="bg-gray-800">{cat}</option>)}
                                            </select>
                                        </div>
                                        <button type="submit" className="w-full flex items-center justify-center gap-2 py-4 text-lg bg-green-600 font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">Add Expense</button>
                                    </form>
                                </div>
                                {/* Total Expenses */}
                                <div className="backdrop-blur-xl bg-black/30 rounded-2xl p-8 border border-white/20 shadow-2xl text-center">
                                    <h3 className="text-xl font-bold text-white/80">Total Expenses</h3>
                                    {Object.keys(totalExpensesByCurrency).length > 0 ? (
                                        Object.entries(totalExpensesByCurrency).map(([currency, total]) => (
                                            <p key={currency} className="text-4xl font-extrabold text-green-400 mt-2">
                                                {currencyOptions[currency]}{total.toFixed(2)}
                                            </p>
                                        ))
                                    ) : (
                                        <p className="text-4xl font-extrabold text-green-400 mt-2">$0.00</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Expense List */}
                        <div className="lg:col-span-2">
                            <div className="backdrop-blur-xl bg-black/30 rounded-2xl p-8 border border-white/20 shadow-2xl">
                                <h2 className="text-4xl font-bold mb-6">Your Expenses</h2>
                                {loading ? (
                                    <p className="text-center text-white/70 py-10">Loading expenses...</p>
                                ) : expenses.length === 0 ? (
                                    <div className="text-center text-white/60 py-16 p-6 rounded-2xl bg-black/20 border border-white/20">
                                        <p>No expenses recorded yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {expenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((exp) => (
                                            <div key={exp.id} className="bg-black/20 p-5 rounded-lg border border-white/10 flex justify-between items-center transition-all hover:border-white/30">
                                                <div>
                                                    <p className="text-xl font-bold">{exp.name}</p>
                                                    <p className="text-md text-white/70">{exp.category} on {new Date(exp.createdAt).toLocaleString()}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <p className="text-2xl font-semibold text-green-300">{currencyOptions[exp.currency]}{exp.amount.toFixed(2)}</p>
                                                    <button onClick={() => handleDeleteExpense(exp.id)} className="p-2 bg-red-600/80 text-white rounded-full hover:bg-red-500 transition-colors">
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Suspense>
    );
};

export default ExpenseTrackerPage;
