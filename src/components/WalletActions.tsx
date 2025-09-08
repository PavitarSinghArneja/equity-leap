import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import WalletDialog from './WalletDialog';

interface EscrowBalance {
  available_balance: number;
  pending_balance: number;
}

interface WalletActionsProps {
  escrowBalance: EscrowBalance | null;
  onRequestSubmitted?: () => void;
}

const WalletActions = ({ escrowBalance, onRequestSubmitted }: WalletActionsProps) => {
  return (
    <div className="flex gap-2">
      <WalletDialog type="add" escrowBalance={escrowBalance} onSuccess={onRequestSubmitted}>
        <Button size="sm" className="bg-white text-primary hover:bg-white/90">
          <Plus className="w-4 h-4 mr-1" />
          Add Funds
        </Button>
      </WalletDialog>

      <WalletDialog 
        type="withdraw" 
        escrowBalance={escrowBalance} 
        onSuccess={onRequestSubmitted}
      >
        <Button 
          variant="outline" 
          size="sm" 
          className="border-white/30 text-white hover:bg-white/10"
          disabled={!escrowBalance || escrowBalance.available_balance <= 0}
        >
          <Minus className="w-4 h-4 mr-1" />
          Withdraw
        </Button>
      </WalletDialog>
    </div>
  );
};

export default WalletActions;