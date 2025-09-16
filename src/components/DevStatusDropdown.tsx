import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/NewAuthContext';

interface DevStatusDropdownProps {
  onStatusChange: (status: string) => void;
  currentStatus: string;
}

const DevStatusDropdown = ({ onStatusChange, currentStatus }: DevStatusDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const statusOptions = [
    { value: 'trial_active', label: 'Trial Active (14 days)', tier: 'explorer', subscription: false },
    { value: 'trial_expired', label: 'Trial Expired', tier: 'explorer', subscription: false },
    { value: 'waitlist_player', label: 'Waitlist Player (Paid)', tier: 'waitlist_player', subscription: true },
    { value: 'premium_user', label: 'Premium User (Invested)', tier: 'investor', subscription: true },
  ];

  const getCurrentStatusLabel = () => {
    const status = statusOptions.find(s => s.value === currentStatus);
    return status ? status.label : 'Select Status';
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
        DEV
      </Badge>
      
      {isOpen ? (
        <div className="relative">
          <Select value={currentStatus} onValueChange={(value) => {
            onStatusChange(value);
            setIsOpen(false);
          }}>
            <SelectTrigger className="w-48 text-xs">
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      Tier: {option.tier} | Sub: {option.subscription ? 'Yes' : 'No'}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="text-xs flex items-center space-x-1"
        >
          <Settings className="w-3 h-3" />
          <span className="hidden md:inline">{getCurrentStatusLabel()}</span>
          <span className="md:hidden">Status</span>
        </Button>
      )}
    </div>
  );
};

export default DevStatusDropdown;