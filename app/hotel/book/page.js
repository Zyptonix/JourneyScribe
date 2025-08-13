'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import NavigationBarLight from '@/components/NavigationBarLight';

export default function HotelBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const bookingOfferId = searchParams.get('offerId');
  const bookingHotelName = searchParams.get('hotelName'); // Received from offers page

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState('');

  // Booking Form States
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [cardVendor, setCardVendor] = useState('VI'); // Default to Visa
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState(''); // YYYY-MM
  const [cardHolderName, setCardHolderName] = useState('');

  useEffect(() => {
    if (!bookingOfferId || !bookingHotelName) {
      setError("Missing offer details to proceed with booking. Please go back to hotel offers.");
    }
  }, [bookingOfferId, bookingHotelName]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBookingSuccessMessage('');

    // Client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    const phoneRegex = /^\+?[0-9\s-]{7,15}$/;
    if (!phoneRegex.test(guestPhone)) {
      setError("Please enter a valid phone number.");
      setLoading(false);
      return;
    }

    if (!/^\d{13,16}$/.test(cardNumber)) {
        setError("Please enter a valid 13-16 digit card number.");
        setLoading(false);
        return;
    }

    const [expYear, expMonth] = expiryDate.split('-').map(Number);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (!expiryDate || !expYear || expMonth < 1 || expMonth > 12 ||
        expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        setError("Please enter a valid future expiry date (YYYY-MM).");
        setLoading(false);
        return;
    }

    if (!bookingOfferId || !guestFirstName || !guestLastName || !cardHolderName) { 
      setError("Please fill in all required guest and payment details.");
      setLoading(false);
      return;
    }

    try {
      const bookingData = {
        guestInfo: [{
          title: "MR", // Simplified for demo; would ideally be a selectable option
          firstName: guestFirstName,
          lastName: guestLastName,
          phone: guestPhone,
          email: guestEmail
        }],
        hotelOfferId: bookingOfferId,
        paymentDetails: {
          method: "CREDIT_CARD",
          paymentCard: {
            paymentCardInfo: {
              vendorCode: cardVendor,
              cardNumber: cardNumber,
              expiryDate: expiryDate,
              holderName: cardHolderName
            }
          }
        }
      };

      const response = await fetch('/api/hotels/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setBookingSuccessMessage(`Booking successful! Confirmation ID: ${data.bookingId}`);
        // Optionally, redirect to a confirmation page or clear form
        // router.push(`/confirmation?bookingId=${data.bookingId}`);
        // Clear form fields after successful submission
        setGuestFirstName(''); setGuestLastName(''); setGuestEmail(''); setGuestPhone('');
        setCardNumber(''); setExpiryDate(''); setCardHolderName('');
      } else {
        setError(data.error || 'Booking failed. Please try again.');
        console.error("Booking API error response:", data.amadeusResponse);
      }
    } catch (err) {
      console.error("Booking submission error:", err);
      setError(`Network error during booking: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!bookingOfferId) {
    return (
        <div className="min-h-screen p-8 bg-slate-50 font-inter flex items-center justify-center">
            <p className="text-xl text-red-700">Invalid booking link. Please go back to hotel offers to select an offer.</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
        
        <div><NavigationBarLight /></div>
        <div className="p-8 ">
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6"> {/* Increased max-w to accommodate side-by-side */}
            <h1 className="text-3xl font-bold text-center text-slate-800 mb-6">Book Your Stay 🔑</h1>

            {error && (
              <p className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">{error}</p>
            )}
            {bookingSuccessMessage && (
              <p className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-center font-semibold">{bookingSuccessMessage}</p>
            )}

            <h2 className="text-2xl font-bold text-slate-700 mb-4">Confirm Booking for {bookingHotelName}</h2>
            <p className="text-slate-600 mb-4">Offer ID: {bookingOfferId}</p>
            <p className="text-slate-600 mb-4">Please provide your details to confirm the booking.</p>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              {/* Added a responsive grid for side-by-side layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
                {/* Guest Details Section */}
                <div>
                  <h3 className="text-xl font-semibold text-slate-700 mb-4">Guest Details</h3>
                  <div className="space-y-4"> {/* Inner spacing for guest details */}
                    <input
                      type="text"
                      placeholder="First Name"
                      value={guestFirstName}
                      onChange={(e) => setGuestFirstName(e.target.value)}
                      className="text-black p-3 border rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={guestLastName}
                      onChange={(e) => setGuestLastName(e.target.value)}
                      className="text-black p-3 border rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="text-black p-3 border rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone (e.g., +1234567890)"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="text-black p-3 border rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Payment Details Section */}
                <div>
                  <h3 className="text-xl font-semibold text-slate-700 mb-4">Payment Details (Dummy)</h3>
                  <div className="space-y-4"> {/* Inner spacing for payment details */}
                    <select
                      value={cardVendor}
                      onChange={(e) => setCardVendor(e.target.value)}
                      className="text-black p-3 border rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="VI">Visa</option>
                      <option value="MC">Mastercard</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Card Number (13-16 digits)"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                      className="text-black p-3 border rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
                      required
                      maxLength="16"
                    />
                    <input
                      type="month"
                      placeholder="Expiry Date (YYYY-MM)"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="text-black p-3 border rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Card Holder Name"
                      value={cardHolderName}
                      onChange={(e) => setCardHolderName(e.target.value)}
                      className="text-black p-3 border rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div> {/* End of grid layout */}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 mt-6" // Added margin top
                disabled={loading}
              >
                {loading ? 'Confirming Booking...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        </div>
    </div>
  );
}
