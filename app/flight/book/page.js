'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NavigationBar from '@/components/NavigationBar';

// --- Icon Components ---
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PlaneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;

// --- Helper Functions ---
const formatDate = (dateTime) => new Date(dateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const formatTime = (dateTime) => new Date(dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

// --- Main Booking Page Component ---
export default function FlightBookingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [flightOffer, setFlightOffer] = useState(null);
    const [travelers, setTravelers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bookingResult, setBookingResult] = useState(null);

    useEffect(() => {
        const offerData = searchParams.get('offer');
        if (offerData) {
            try {
                const parsedOffer = JSON.parse(decodeURIComponent(offerData));
                setFlightOffer(parsedOffer);
                const numberOfTravelers = parsedOffer.travelerPricings.length;
                setTravelers(Array.from({ length: numberOfTravelers }, () => ({
                    firstName: '', lastName: '', dateOfBirth: '', gender: 'MALE',
                    email: '', phoneCountryCode: '880', phoneNumber: '',
                    passport: { number: '', expiryDate: '', issuanceCountry: '', nationality: '' }
                })));
            } catch (e) {
                setError('Invalid flight offer data.');
            }
        }
    }, [searchParams]);

    const handleTravelerChange = (index, field, value) => {
        const updatedTravelers = [...travelers];
        const keys = field.split('.');
        if (keys.length > 1) {
            updatedTravelers[index][keys[0]][keys[1]] = value;
        } else {
            updatedTravelers[index][field] = value;
        }
        setTravelers(updatedTravelers);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setBookingResult(null);
        try {
            const response = await fetch('/api/flights/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flightOffer, travelers }),
            });
            const data = await response.json();
            if (response.ok) {
                setBookingResult(data);
            } else {
                const errorMessage = data.errors?.map(err => `${err.title}: ${err.detail}`).join(', ') || 'Booking failed.';
                setError(errorMessage);
            }
        } catch (err) {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    if (bookingResult) {
        return <FlightBookingConfirmationPage bookingData={bookingResult} />;
    }
    
    const inputStyles = "bg-white/80 text-black placeholder-slate-400 p-3 border border-slate-300 rounded-lg w-full focus:ring-cyan-500 focus:border-cyan-500";
    const selectStyles = "bg-white/80 text-black p-3 border border-slate-300 rounded-lg w-full";

    return (
        <div className="min-h-screen font-inter">
            <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/assets/flightresults.jpg')" }}></div>
            <div className="fixed inset-0 -z-10 bg-black/10"></div>
            <NavigationBar />
            <div className="p-4 md:p-8 flex items-center justify-center">
                <div className="max-w-4xl w-full bg-white/50 backdrop-blur-xl rounded-xl shadow-lg p-8 border border-white/20">
                    <h1 className="text-3xl font-bold text-center text-slate-800 mb-8">Complete Your Booking</h1>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {travelers.map((traveler, index) => (
                            <div key={index} className="space-y-4 border-t border-slate-300 pt-6">
                                <h2 className="text-xl font-semibold text-slate-700">Traveler {index + 1} ({flightOffer?.travelerPricings[index].travelerType})</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="First Name" value={traveler.firstName} onChange={(e) => handleTravelerChange(index, 'firstName', e.target.value)} required className={inputStyles} />
                                    <input type="text" placeholder="Last Name" value={traveler.lastName} onChange={(e) => handleTravelerChange(index, 'lastName', e.target.value)} required className={inputStyles} />
                                    <input type="date" value={traveler.dateOfBirth} onChange={(e) => handleTravelerChange(index, 'dateOfBirth', e.target.value)} required className={inputStyles} />
                                    <select value={traveler.gender} onChange={(e) => handleTravelerChange(index, 'gender', e.target.value)} className={selectStyles}><option value="MALE">Male</option><option value="FEMALE">Female</option></select>
                                    <input type="email" placeholder="Email" value={traveler.email} onChange={(e) => handleTravelerChange(index, 'email', e.target.value)} required className={inputStyles} />
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="880" value={traveler.phoneCountryCode} onChange={(e) => handleTravelerChange(index, 'phoneCountryCode', e.target.value)} className={`${inputStyles} max-w-20`} />
                                        <input type="text" placeholder="Phone Number" value={traveler.phoneNumber} onChange={(e) => handleTravelerChange(index, 'phoneNumber', e.target.value)} required className={`${inputStyles} flex-1`} />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold pt-4 text-slate-600">Passport Details (Optional)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Passport Number" value={traveler.passport.number} onChange={(e) => handleTravelerChange(index, 'passport.number', e.target.value)} className={inputStyles} />
                                    <input type="date" value={traveler.passport.expiryDate} onChange={(e) => handleTravelerChange(index, 'passport.expiryDate', e.target.value)} className={inputStyles} />
                                    <input type="text" placeholder="Issuance Country (e.g., BD)" value={traveler.passport.issuanceCountry} onChange={(e) => handleTravelerChange(index, 'passport.issuanceCountry', e.target.value)} className={inputStyles} />
                                    <input type="text" placeholder="Nationality (e.g., BD)" value={traveler.passport.nationality} onChange={(e) => handleTravelerChange(index, 'passport.nationality', e.target.value)} className={inputStyles} />
                                </div>
                            </div>
                        ))}
                        {error && <p className="text-red-600 text-center p-3 bg-red-100 rounded-lg">{error}</p>}
                        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 rounded-lg font-bold text-lg hover:from-blue-600 hover:to-cyan-600 transition-colors">
                            {loading ? 'Processing...' : 'Confirm Booking'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// --- Confirmation Page Component ---
function FlightBookingConfirmationPage({ bookingData }) {
    const { data } = bookingData;
    const bookingRef = data.associatedRecords[0].reference;
    const flightOffer = data.flightOffers[0];

    return (
        <div className="min-h-screen font-inter">
            <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/assets/flightresults.jpg')" }}></div>
            <div className="fixed inset-0 -z-10 bg-black/10"></div>
            <NavigationBar />
            <div className="p-4 md:p-8 max-w-4xl mx-auto">
                <div className="bg-white/50 backdrop-blur-xl rounded-xl shadow-lg p-8 text-center border border-white/20">
                    <div className="flex justify-center"><CheckCircleIcon /></div>
                    <h1 className="text-3xl font-bold text-slate-800 mt-4">Booking Confirmed!</h1>
                    <p className="text-slate-600 mt-2">Your flight has been successfully booked. Your booking reference is:</p>
                    <p className="text-4xl font-extrabold text-blue-600 mt-4 bg-blue-50/30 inline-block px-6 py-2 rounded-lg border border-blue-200">{bookingRef}</p>
                </div>

                <div className="mt-8 bg-white/50 backdrop-blur-xl rounded-xl shadow-lg p-8 border border-white/20">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Traveler Information</h2>
                    <div className="space-y-4">
                        {data.travelers.map(traveler => (
                            <div key={traveler.id} className="flex items-center gap-4 p-4 bg-slate-50/30 rounded-lg border border-slate-200">
                                <UserIcon />
                                <div>
                                    <p className="font-semibold text-slate-700">{traveler.name.firstName} {traveler.name.lastName}</p>
                                    <p className="text-sm text-slate-500">{traveler.contact.emailAddress}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 bg-white/50 backdrop-blur-xl rounded-xl shadow-lg p-8 border border-white/20">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Flight Itinerary</h2>
                    <div className="space-y-6">
                        {flightOffer.itineraries.map((itinerary, index) => (
                            <div key={index}>
                                <h3 className="text-lg font-semibold text-slate-700 mb-3">{index === 0 ? 'Outbound Flight' : 'Return Flight'}</h3>
                                {itinerary.segments.map((segment) => (
                                    <div key={segment.id} className="relative pl-8 border-l-2 border-slate-200 pb-6 last:pb-0">
                                        <div className="absolute -left-4 top-1 h-8 w-8 bg-white rounded-full flex items-center justify-center border-2 border-slate-200"><PlaneIcon /></div>
                                        <p className="font-bold text-slate-800">{formatDate(segment.departure.at)}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-slate-600">{formatTime(segment.departure.at)} - {segment.departure.iataCode}</p>
                                            <p className="text-slate-500 text-sm">{segment.duration.replace('PT', '').replace('H', 'h ').replace('M', 'm')}</p>
                                            <p className="text-slate-600">{formatTime(segment.arrival.at)} - {segment.arrival.iataCode}</p>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">Carrier: {segment.carrierCode} {segment.number}</p>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
