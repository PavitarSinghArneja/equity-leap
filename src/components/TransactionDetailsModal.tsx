import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  CreditCard,
  Download,
  Building2,
  User,
  Receipt,
  TrendingUp,
  DollarSign,
  Hash,
  Clock,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  created_at: string;
  transaction_type: string;
  status: string;
  description?: string;
  reference_id?: string;
  properties?: {
    id: string;
    title: string;
    share_price: number;
    city?: string;
    country?: string;
  };
  // Additional calculated fields for display
  shares_purchased?: number;
  fee_amount?: number;
  net_amount?: number;
}

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  transaction,
  isOpen,
  onClose
}) => {
  if (!transaction) return null;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'investment':
        return <TrendingUp className="w-5 h-5 text-primary" />;
      case 'share_sale':
        return <TrendingUp className="w-5 h-5 text-red-600 rotate-180" />;
      case 'share_purchase':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'deposit':
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'withdrawal':
        return <Receipt className="w-5 h-5 text-orange-600" />;
      case 'fee':
        return <Hash className="w-5 h-5 text-red-600" />;
      default:
        return <Receipt className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
      processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge className={`${config.color} hover:opacity-80`}>
        {status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'failed' && <AlertTriangle className="w-3 h-3 mr-1" />}
        {status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateSharesPurchased = () => {
    if (transaction.transaction_type === 'investment' && transaction.properties?.share_price) {
      return Math.floor(transaction.amount / transaction.properties.share_price);
    }
    return null;
  };

  const sharesPurchased = calculateSharesPurchased();
  const feeAmount = transaction.transaction_type === 'investment' ? transaction.amount * 0.02 : 0; // 2% platform fee
  const netAmount = transaction.transaction_type === 'deposit' ? transaction.amount - 10 : transaction.amount; // ₹10 processing fee

  const handleDownloadReceipt = () => {
    // TODO: Implement receipt download functionality
    console.log('Download receipt for transaction:', transaction.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-3">
            {getTransactionIcon(transaction.transaction_type)}
            Transaction Details
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {transaction.transaction_type.charAt(0).toUpperCase() + 
                   transaction.transaction_type.slice(1).replace('_', ' ')}
                </h3>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
              <div className="text-right">
                {getStatusBadge(transaction.status)}
                <p className="text-sm text-muted-foreground mt-1">
                  ID: {transaction.id.slice(-8).toUpperCase()}
                </p>
              </div>
            </div>

            {transaction.description && (
              <p className="text-sm text-muted-foreground bg-background rounded p-3">
                {transaction.description}
              </p>
            )}
          </div>

          {/* Property Information (if applicable) */}
          {transaction.properties && (
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Property Details
              </h4>
              <div className="space-y-2">
                <p className="font-medium">{transaction.properties.title}</p>
                {transaction.properties.city && (
                  <p className="text-sm text-muted-foreground">
                    📍 {transaction.properties.city}, {transaction.properties.country}
                  </p>
                )}
                <p className="text-sm">
                  Share Price: {formatCurrency(transaction.properties.share_price)}
                </p>
                {sharesPurchased && (
                  <p className="text-sm">
                    Shares Purchased: <span className="font-medium">{sharesPurchased}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Transaction Breakdown */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Transaction Breakdown
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Base Amount</span>
                <span className="text-sm font-medium">{formatCurrency(transaction.amount)}</span>
              </div>
              
              {feeAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Platform Fee (2%)</span>
                  <span className="text-sm text-muted-foreground">- {formatCurrency(feeAmount)}</span>
                </div>
              )}
              
              {transaction.transaction_type === 'deposit' && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Processing Fee</span>
                  <span className="text-sm text-muted-foreground">- ₹10.00</span>
                </div>
              )}
              
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Net Amount</span>
                <span>{formatCurrency(netAmount)}</span>
              </div>
            </div>
          </div>

          {/* Transaction Timeline */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Timeline
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Transaction Initiated</p>
                  <p className="text-xs text-muted-foreground">{formatDate(transaction.created_at)}</p>
                </div>
              </div>
              
              {transaction.status === 'completed' && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Transaction Completed</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(transaction.created_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Additional Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Transaction ID</p>
                <p className="font-mono">{transaction.id}</p>
              </div>
              {transaction.reference_id && (
                <div>
                  <p className="text-muted-foreground">Reference ID</p>
                  <p className="font-mono">{transaction.reference_id}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Transaction Date</p>
                <p>{formatDate(transaction.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Method</p>
                <p>Online Banking</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleDownloadReceipt} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Receipt className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetailsModal;