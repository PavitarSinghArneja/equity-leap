import React from 'react';
import MyWatchlistEnhanced from '@/components/MyWatchlistEnhanced';

const WatchlistPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Watchlist</h1>
      <MyWatchlistEnhanced />
    </div>
  );
};

export default WatchlistPage;

