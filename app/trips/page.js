// app/trips/page.js
"use client";

import { useEffect, useMemo, useState } from "react";

/** ---------- helpers ---------- */
function isFirestoreTimestamp(v) {
  return v && typeof v === "object" && ("seconds" in v || "_seconds" in v);
}

function fmtDate(v) {
  if (!v) return "N/A";
  if (isFirestoreTimestamp(v)) {
    const sec = v.seconds ?? v._seconds;
    return new Date(sec * 1000).toLocaleDateString();
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString();
}

async function safeFetchJSON(url, options) {
  try {
    const res = await fetch(url, options);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      // probably an HTML 404/error page — avoid JSON.parse crash
      return { data: null, error: `Non-JSON response (${res.status})` };
    }
    const json = await res.json();
    if (!res.ok) return { data: null, error: json?.message || `Error ${res.status}` };
    return { data: json, error: null };
  } catch (e) {
    return { data: null, error: e?.message || "Network error" };
  }
}

/** ---------- page ---------- */
export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [errorTrips, setErrorTrips] = useState(null);

  // create form
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userId, setUserId] = useState(""); // required by your POST API
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const selectedTrip = useMemo(
    () => trips.find(t => t.id === selectedId) || null,
    [trips, selectedId]
  );

  // Load all trips
  useEffect(() => {
    (async () => {
      setLoadingTrips(true);
      setErrorTrips(null);
      const { data, error } = await safeFetchJSON("/api/trips");
      if (error) setErrorTrips(error);
      setTrips(Array.isArray(data?.trips) ? data.trips : []);
      setLoadingTrips(false);
    })();
  }, []);

  // Create a new trip
  const createTrip = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);

    const body = {
      tripName: tripName.trim(),
      startDate,
      endDate,
      userId: userId.trim(),
    };

    const { data, error } = await safeFetchJSON("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (error) {
      setCreateMsg(`❌ ${error}`);
    } else {
      setCreateMsg("✅ Trip created");
      // optimistic add
      if (data?.id) {
        setTrips(prev => [{ id: data.id, ...data }, ...prev]);
        setSelectedId(data.id);
      }
      // reset form
      setTripName("");
      setStartDate("");
      setEndDate("");
      setUserId("");
    }
    setCreating(false);
  };

  return (
    <div
      className="min-h-screen w-full bg-center bg-cover p-6"
      style={{ backgroundImage: "url('/assets/trips.jpeg')" }} // put bg.jpg in /public
    >
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Trips list + Create */}
        <section className="lg:col-span-1 space-y-6">
          {/* Create card */}
          <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">➕ Create Trip</h2>
            <form onSubmit={createTrip} className="space-y-3">
              <input
                className="w-full rounded-xl bg-white/20 text-white placeholder-white/70 px-4 py-2 outline-none border border-white/20"
                placeholder="Trip name"
                value={tripName}
                onChange={e => setTripName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="rounded-xl bg-white/20 text-white px-4 py-2 outline-none border border-white/20"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                />
                <input
                  type="date"
                  className="rounded-xl bg-white/20 text-white px-4 py-2 outline-none border border-white/20"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                />
              </div>
              <input
                className="w-full rounded-xl bg-white/20 text-white placeholder-white/70 px-4 py-2 outline-none border border-white/20"
                placeholder="Your userId (leaderId)"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-white text-black font-semibold py-2 hover:opacity-90 transition disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              {createMsg && (
                <p className="text-sm text-white/90">{createMsg}</p>
              )}
            </form>
          </div>

          {/* Trips list card */}
          <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">✈ Your Trips</h2>
              {loadingTrips && <span className="text-white/80 text-sm">Loading…</span>}
            </div>
            {errorTrips && (
              <p className="text-rose-200 text-sm mb-3">Error: {errorTrips}</p>
            )}
            {trips.length === 0 ? (
              <p className="text-white/80 text-sm">No trips yet. Create one!</p>
            ) : (
              <ul className="space-y-3">
                {trips.map(t => (
                  <li
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`p-4 rounded-xl cursor-pointer transition border ${
                      selectedId === t.id
                        ? "bg-white/30 border-white/60"
                        : "bg-white/20 border-white/20 hover:bg-white/25"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">{t.name || t.title || "Untitled Trip"}</h3>
                      <span className="text-xs text-white/80">
                        {fmtDate(t.startDate)} — {fmtDate(t.endDate)}
                      </span>
                    </div>
                    <p className="text-white/80 text-xs mt-1">
                      👤 Leader: {t.leaderId || "—"} · 👥 Members: {Array.isArray(t.users) ? t.users.length : 1}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Right: Details (we’ll enhance in next steps) */}
        <section className="lg:col-span-2 rounded-2xl p-6 bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl">
          {!selectedTrip ? (
            <div className="h-full min-h-[360px] grid place-items-center">
              <p className="text-white/90">Select a trip from the left to view details.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-white">
                    {selectedTrip.name || "Trip"}
                  </h1>
                  <p className="text-white/80">
                    {fmtDate(selectedTrip.startDate)} — {fmtDate(selectedTrip.endDate)}
                  </p>
                </div>
              </header>

              <div className="grid md:grid-cols-2 gap-4">
                <Card title="Leader">
                  <p className="text-white/90">{selectedTrip.leaderId || "—"}</p>
                </Card>
                <Card title="Members">
                  <p className="text-white/90">
                    {Array.isArray(selectedTrip.users) ? selectedTrip.users.join(", ") : "—"}
                  </p>
                </Card>
              </div>

              <Card title="Overview">
                <ul className="list-disc pl-5 text-white/90 space-y-1">
                  <li>Created: {fmtDate(selectedTrip.createdAt)}</li>
                  <li>Activities: {Array.isArray(selectedTrip.activities) ? selectedTrip.activities.length : 0}</li>
                  <li>Budget total: {selectedTrip?.budget?.total ?? 0}</li>
                </ul>
              </Card>
              <Card title="Budget">
                 <BudgetManager tripId={selectedTrip.id} />
              </Card>
                 <Card title="Plans / Activities">
                 <PlanManager tripId={selectedTrip.id} />
              </Card>
              <Card title="History">
                 <HistoryViewer tripId={selectedTrip.id} />
              </Card>

            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl p-4 bg-white/10 border border-white/50">
      <div className="text-white/90 font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}
function BudgetManager({ tripId }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  // Load budget
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await safeFetchJSON(`/api/trips/${tripId}/budget`);
      setExpenses(data?.expenses || []);
      setLoading(false);
    })();
  }, [tripId]);

  const addExpense = async (e) => {
    e.preventDefault();
    const body = { amount: Number(amount), description: desc };
    const { data } = await safeFetchJSON(`/api/trips/${tripId}/budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (data) setExpenses(prev => [...prev, data]);
    setAmount("");
    setDesc("");
  };

  return (
    <div className="space-y-3">
        
      {loading ? (
        <p className="text-black/80">Loading budget…</p>
      ) : (
        <>
          <ul className="space-y-1 text-black/90">
            {expenses.map((ex, i) => (
              <li key={i}>
                💸 {ex.description} — {ex.amount}
              </li>
            ))}
          </ul>

          <form onSubmit={addExpense} className="flex gap-2">
            <input
              placeholder="Amount"
              type="number"
              className="flex-1 rounded-lg bg-white/20 text-white px-2 py-1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
            <input
              placeholder="Description"
              className="flex-1 rounded-lg bg-white/20 text-white px-2 py-1"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-white text-black px-3"
            >
              ➕
            </button>
          </form>
        </>
      )}
    </div>
  );
}
function PlanManager({ tripId }) {
  const [plans, setPlans] = useState([]);
  const [activity, setActivity] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await safeFetchJSON(`/api/trips/${tripId}/plan`);
      setPlans(data?.activities || []);
    })();
  }, [tripId]);

  const addPlan = async (e) => {
    e.preventDefault();
    const body = { name: activity };
    const { data } = await safeFetchJSON(`/api/trips/${tripId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (data) setPlans(prev => [...prev, data]);
    setActivity("");
  };

  return (
    <div className="space-y-2 bg=''">
      <ul className="space-y-1 text-black/90">
        {plans.map((p, i) => (
          <li key={i}>📍 {p.name}</li>
        ))}
      </ul>
      <form onSubmit={addPlan} className="flex gap-2">
        <input
          placeholder="New activity"
          className="flex-1 rounded-lg bg-white/20 text-white px-2 py-1"
          value={activity}
          onChange={e => setActivity(e.target.value)}
          required
        />
        <button type="submit" className="rounded-lg bg-white text-black px-3">
          ➕
        </button>
      </form>
    </div>
  );
}

function HistoryViewer({ tripId }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await safeFetchJSON(`/api/trips/history`);
      setHistory(data?.history?.filter(h => h.tripId === tripId) || []);
    })();
  }, [tripId]);

  return (
    <ul className="space-y-1 text-white/90 text-sm">
      {history.map(h => (
        <li key={h.id}>
          🕓 {new Date(h.timestamp.seconds * 1000).toLocaleString()} — {h.action}
        </li>
      ))}
    </ul>
  );
}
