import React from 'react';
import MyShareSellRequests from '@/components/MyShareSellRequests';

const SellRequestsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">My Sell Requests</h1>
      <MyShareSellRequests />
    </div>
  );
};

export default SellRequestsPage;

