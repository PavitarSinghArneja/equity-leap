import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AdminShareControls from '@/components/AdminShareControls';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import {
  ArrowLeft,
  TrendingDown,
  Home,
  Trash2
} from 'lucide-react';

const AdminShareTrading: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useAuth();
  const [cleaningUp, setCleaningUp] = useState(false);

  const handleCleanupExpired = async () => {
    setCleaningUp(true);
    try {
      const { error } = await supabase.rpc('expire_holds_and_reservations');
      if (error) throw error;

      addNotification({
        name: 'Cleanup Complete',
        description: 'Expired holds and reservations have been cleaned up',
        icon: 'CHECK_CIRCLE',
        color: '#059669',
        isLogo: true
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      addNotification({
        name: 'Cleanup Failed',
        description: 'Failed to clean up expired items',
        icon: 'ALERT_TRIANGLE',
        color: '#DC2626',
        isLogo: true
      });
    } finally {
      setCleaningUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Share Trading Controls</h1>
              <p className="text-sm text-muted-foreground">Manage property share selling permissions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupExpired}
              disabled={cleaningUp}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {cleaningUp ? 'Cleaning...' : 'Cleanup Expired'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/overview')}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
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
