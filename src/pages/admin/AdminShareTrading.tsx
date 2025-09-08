import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AdminShareControls from '@/components/AdminShareControls';
import { 
  ArrowLeft,
  TrendingDown,
  Home
} from 'lucide-react';

const AdminShareTrading: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">Share Trading Controls</span>
              <p className="text-sm text-muted-foreground">Manage property share selling permissions</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Instructions */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">🎛️ Share Trading Administration</h2>
            <p className="text-blue-800 mb-4">
              Use this panel to control which properties allow investors to sell their shares to other users.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <h3 className="font-medium mb-2">Enable Share Selling:</h3>
                <ul className="space-y-1 text-xs">
                  <li>• Toggle "Allow Share Selling" for each property</li>
                  <li>• Only sold-out properties typically allow share trading</li>
                  <li>• Alerts will be sent to watchlist users automatically</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Set Actual ROI:</h3>
                <ul className="space-y-1 text-xs">
                  <li>• Enter actual ROI for completed properties</li>
                  <li>• Only shows for sold-out (funded) properties</li>
                  <li>• Helps investors make informed decisions</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Admin Share Controls Component */}
          <AdminShareControls />
        </div>
      </div>
    </div>
  );
};

export default AdminShareTrading;