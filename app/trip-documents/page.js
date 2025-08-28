'use client';

import React from 'react';
import TripDocumentsAndNotes from '../../components/TripDocumentsAndNotes';
import NavigationBarDark from '../../components/NavigationBarDark';
import NavigationBarLight from '@/components/NavigationBarLight';

const TripDocumentsPage = () => {
  return (
    <div>
      <TripDocumentsAndNotes />
      <div className="fixed top-0 w-full z-50"><NavigationBarDark /></div>
    </div>
  );
};

export default TripDocumentsPage;