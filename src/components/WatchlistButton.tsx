import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, HeartIcon } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user, addNotification } = useAuth();
  const { isInWatchlist, toggleWatchlist, loading } = useWatchlist();
  const [isToggling, setIsToggling] = useState(false);

  const isWatched = isInWatchlist(propertyId);

  const handleToggleWatchlist = async () => {
    if (!user) {
      addNotification({
        name: "Login Required",
        description: "Please log in to add properties to your watchlist",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        time: new Date().toLocaleTimeString(),
        isLogo: false
      });
      return;
    }

    setIsToggling(true);
    try {
      const result = await toggleWatchlist(propertyId);
      
      if (result.success) {
        addNotification({
          name: isWatched ? "Removed from Watchlist" : "Added to Watchlist",
          description: isWatched 
            ? "Property removed from your watchlist" 
            : "Property saved to your watchlist",
          icon: "CHECK_CIRCLE",
          color: "#059669",
          time: new Date().toLocaleTimeString(),
          isLogo: false
        });
      } else {
        addNotification({
          name: "Watchlist Error",
          description: result.error || "Something went wrong",
          icon: "ALERT_TRIANGLE",
          color: "#DC2626",
          time: new Date().toLocaleTimeString(),
          isLogo: false
        });
      }
    } catch (error) {
      console.error('Watchlist toggle error:', error);
    } finally {
      setIsToggling(false);
    }
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

  if (variant === 'icon') {
    return (
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
    );
  }

  return (
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
    </Button>
  );
};

export default WatchlistButton;