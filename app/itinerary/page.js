'use client';

import ItineraryBuilder from '../../components/ItineraryBuilder';
import NavigationBarLight from '../../components/NavigationBarLight';
import NavigationBarDark from '@/components/NavigationBarDark';

export default function ItineraryPage() {
  return (
    <main className="content-with-navbar">
      <div className="fixed top-0 w-full z-50">
        <NavigationBarDark />
      </div>
      <ItineraryBuilder />
    </main>
  );
}