'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import NavigationBarDark from '@/components/NavigationBarDark';

// --- Icon Components ---
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export default function HotelBookingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const bookingOfferId = searchParams.get('offerId');
    const bookingHotelName = searchParams.get('hotelName');
    const adults = parseInt(searchParams.get('adults') || '1', 10);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bookingResult, setBookingResult] = useState(null);

    const [guests, setGuests] = useState([]);
    const [cardVendor, setCardVendor] = useState('VI');
    const [cardNumber, setCardNumber] = useState('4111111111111111');
    const [expiryDate, setExpiryDate] = useState('2030-12');
    const [cardHolderName, setCardHolderName] = useState('JOHN SMITH');

    useEffect(() => {
        if (!bookingOfferId || !bookingHotelName) {
            setError("Missing offer details. Please go back to select an offer.");
        }
        setGuests(Array.from({ length: adults }, () => ({
            title: 'MR', firstName: '', lastName: '', phone: '', email: ''
        })));
    }, [bookingOfferId, bookingHotelName, adults]);

    const handleGuestChange = (index, field, value) => {
        const updatedGuests = [...guests];
        updatedGuests[index][field] = value;
        setGuests(updatedGuests);
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const bookingData = {
                guestInfo: guests,
                hotelOfferId: bookingOfferId,
                paymentDetails: {
                    method: "CREDIT_CARD",
                    paymentCard: { paymentCardInfo: { vendorCode: cardVendor, cardNumber, expiryDate, holderName: cardHolderName } }
                }
            };

            // --- FIX: Added console.log for debugging ---
            console.log("Submitting the following data to /api/hotels/book:", JSON.stringify(bookingData, null, 2));

            const response = await fetch('/api/hotels/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                sessionStorage.setItem('bookingConfirmationData', JSON.stringify(data.amadeusResponse));
                router.push(`/hotel/confirmation`);
            } else {
                setError(data.error || 'Booking failed. Please try again.');
            }
        } catch (err) {
            setError(`Network error during booking: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const inputStyles = "bg-white/10 text-white placeholder-slate-300 p-3 pl-10 border border-white/20 rounded-lg w-full shadow-[inset_0_0_0_1000px_rgba(0,0,0,0.2)] focus:ring-cyan-400 focus:border-cyan-400";

    if (bookingResult) {
        return <HotelBookingConfirmationPage bookingData={bookingResult} />;
    }

    return (
        <div className="min-h-screen font-inter">
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-cyan-900 via-blue-900 to-black"></div>
            <NavigationBarDark />
            <div className="p-4 md:p-8 flex items-center justify-center">
                <div className="max-w-4xl w-full bg-black/20 backdrop-blur-xl rounded-xl shadow-lg p-8 border border-white/20">
                    <h1 className="text-3xl font-bold text-center text-white mb-2">Book Your Stay 🔑</h1>
                    <h2 className="text-xl text-center text-slate-300 mb-8">Confirm Booking for {bookingHotelName}</h2>

                    {error && <p className="mb-4 p-3 bg-red-500/50 text-white rounded-lg text-center">{error}</p>}
                    
                    <form onSubmit={handleBookingSubmit} className="space-y-8">
                        <div className="space-y-6">
                            {guests.map((guest, index) => (
                                <div key={index} className="space-y-4 border-t border-white/20 pt-6">
                                    <h3 className="text-xl font-semibold text-slate-100">Guest {index + 1} Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <select value={guest.title} onChange={(e) => handleGuestChange(index, 'title', e.target.value)} className="bg-black/20 text-white p-3 border border-white/20 rounded-lg w-full"><option className="text-black" value="MR">Mr.</option><option className="text-black" value="MS">Ms.</option></select>
                                        <div className="relative"><div className="absolute left-3 top-3.5"><UserIcon /></div><input type="text" placeholder="First Name" value={guest.firstName} onChange={(e) => handleGuestChange(index, 'firstName', e.target.value)} className={inputStyles} required /></div>
                                        <div className="relative"><div className="absolute left-3 top-3.5"><UserIcon /></div><input type="text" placeholder="Last Name" value={guest.lastName} onChange={(e) => handleGuestChange(index, 'lastName', e.target.value)} className={inputStyles} required /></div>
                                        <div className="relative"><div className="absolute left-3 top-3.5"><MailIcon /></div><input type="email" placeholder="Email" value={guest.email} onChange={(e) => handleGuestChange(index, 'email', e.target.value)} className={inputStyles} required /></div>
                                        <div className="relative"><div className="absolute left-3 top-3.5"><PhoneIcon /></div><input type="tel" placeholder="Phone" value={guest.phone} onChange={(e) => handleGuestChange(index, 'phone', e.target.value)} className={inputStyles} required /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="space-y-4 border-t border-white/20 pt-6">
                            <h3 className="text-xl font-semibold text-slate-100">Payment Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <select value={cardVendor} onChange={(e) => setCardVendor(e.target.value)} className="bg-black/20 text-white p-3 border border-white/20 rounded-lg w-full" required><option className="text-black" value="VI">Visa</option><option className="text-black" value="MC">Mastercard</option></select>
                                <div className="relative"><div className="absolute left-3 top-3.5"><CreditCardIcon /></div><input type="text" placeholder="Card Number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))} className={inputStyles} required maxLength="16" /></div>
                                <input type="month" placeholder="Expiry Date (YYYY-MM)" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="bg-black/20 text-white p-3 border border-white/20 rounded-lg w-full shadow-[inset_0_0_0_1000px_rgba(0,0,0,0.2)]" required />
                                <div className="relative"><div className="absolute left-3 top-3.5"><UserIcon /></div><input type="text" placeholder="Card Holder Name" value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} className={inputStyles} required /></div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-colors disabled:opacity-50 mt-6" disabled={loading}>
                            {loading ? 'Confirming Booking...' : 'Confirm Booking'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// --- Confirmation Page Component ---
// This component remains on a separate page: app/hotel/confirmation/page.js
// No changes are needed here.
function HotelBookingConfirmationPage({ bookingData }) {
    // ...

}
