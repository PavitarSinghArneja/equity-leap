import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Heart, HeartIcon, StickyNote } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/contexts/NewAuthContext';
import { cn } from '@/lib/utils';

interface WatchlistButtonProps {
  propertyId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  propertyId,
  variant = 'outline',
  size = 'md',
  className,
  showText = true
}) => {
  const { user, profile } = useAuth();
  const {
    isInWatchlist,
    toggleWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    loading,
    canAccessNotes
  } = useWatchlist();
  const [isToggling, setIsToggling] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notes, setNotes] = useState('');

  const isWatched = isInWatchlist(propertyId);

  const handleToggleWatchlist = async () => {
    if (!user) {
      console.log("Login Required - Please log in to add properties to your watchlist");
      return;
    }

    if (isWatched) {
      // Remove from watchlist
      setIsToggling(true);
      try {
        const result = await removeFromWatchlist(propertyId);
        if (result.success) {
          console.log("Property removed from your watchlist");
        } else {
          console.error('Error removing from watchlist:', result.error);
        }
      } catch (error) {
        console.error('Watchlist remove error:', error);
      } finally {
        setIsToggling(false);
      }
    } else {
      // Add to watchlist - show notes dialog if user can access notes
      if (canAccessNotes) {
        setShowNotesDialog(true);
      } else {
        // Add without notes
        await handleAddToWatchlist();
      }
    }
  };

  const handleAddToWatchlist = async () => {
    setIsToggling(true);
    try {
      const result = await addToWatchlist(propertyId, notes);
      if (result.success) {
        console.log("Property saved to your watchlist");
        setShowNotesDialog(false);
        setNotes('');
      } else {
        console.error('Error adding to watchlist:', result.error);
      }
    } catch (error) {
      console.error('Watchlist add error:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDialogClose = () => {
    setShowNotesDialog(false);
    setNotes('');
  };

  const getButtonProps = () => {
    switch (size) {
      case 'sm':
        return {
          size: 'sm' as const,
          iconSize: 'w-3 h-3'
        };
      case 'lg':
        return {
          size: 'lg' as const,
          iconSize: 'w-5 h-5'
        };
      default:
        return {
          size: 'default' as const,
          iconSize: 'w-4 h-4'
        };
    }
  };

  const { size: buttonSize, iconSize } = getButtonProps();

  const buttonContent = (
    <>
      {isWatched ? (
        <HeartIcon className={cn(iconSize, "fill-current", showText && "mr-2")} />
      ) : (
        <Heart className={cn(iconSize, showText && "mr-2")} />
      )}
      {showText && (
        <span>
          {isToggling
            ? 'Updating...'
            : isWatched
              ? 'Saved'
              : 'Save'
          }
        </span>
      )}
    </>
  );

  if (variant === 'icon') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-8 h-8 p-0 hover:bg-background/80",
            isWatched ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground",
            className
          )}
          onClick={handleToggleWatchlist}
          disabled={isToggling || loading}
        >
          {isWatched ? (
            <HeartIcon className={cn(iconSize, "fill-current")} />
          ) : (
            <Heart className={iconSize} />
          )}
        </Button>
        {renderNotesDialog()}
      </>
    );
  }

  return (
    <>
      <Button
        variant={isWatched ? 'default' : variant}
        size={buttonSize}
        className={cn(
          "transition-all duration-200",
          isWatched && "bg-red-500 hover:bg-red-600 text-white",
          className
        )}
        onClick={handleToggleWatchlist}
        disabled={isToggling || loading}
      >
        {buttonContent}
      </Button>
      {renderNotesDialog()}
    </>
  );

  function renderNotesDialog() {
    return (
      <Dialog open={showNotesDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <StickyNote className="w-5 h-5 mr-2" />
              Add Notes (Optional)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add your thoughts or analysis about this property to help you remember why you're interested.
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why does this property interest you? What are your concerns? Any specific details to remember?"
              className="min-h-[100px]"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {notes.length}/500 characters
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDialogClose}
                  disabled={isToggling}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddToWatchlist}
                  disabled={isToggling}
                >
                  {isToggling ? 'Adding...' : 'Add to Watchlist'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
};

export default WatchlistButton;