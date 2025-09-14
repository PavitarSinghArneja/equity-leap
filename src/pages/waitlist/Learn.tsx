import React from 'react';

const Learn: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Learning Resources</h1>
      <p className="text-muted-foreground mb-6">Curated content to help you get started with fractional property investing.</p>
      <ul className="space-y-3 list-disc pl-5">
        <li>What is fractional property investing?</li>
        <li>Understanding share price, cost basis, and P&L</li>
        <li>How secondary share selling works on Retreat Slice</li>
      </ul>
    </div>
  );
};

export default Learn;
