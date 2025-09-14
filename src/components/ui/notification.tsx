"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Shield, ShieldAlert, Wallet, CreditCard, X, Heart } from "lucide-react";

interface Item {
  id?: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  time: string;
  isLogo?: boolean; // Flag to indicate if icon is an SVG logo
}

const GoogleLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const renderIcon = (icon: string) => {
  switch (icon) {
    case 'GOOGLE':
      return <GoogleLogo />;
    case 'ALERT_TRIANGLE':
      return <AlertTriangle className="w-4 h-4 text-white" />;
    case 'CHECK_CIRCLE':
      return <CheckCircle2 className="w-4 h-4 text-white" />;
    case 'SHIELD':
      return <Shield className="w-4 h-4 text-white" />;
    case 'SHIELD_ALERT':
      return <ShieldAlert className="w-4 h-4 text-white" />;
    case 'WALLET':
      return <Wallet className="w-4 h-4 text-white" />;
    case 'CREDIT_CARD':
      return <CreditCard className="w-4 h-4 text-white" />;
    case 'X':
      return <X className="w-4 h-4 text-white" />;
    case 'HEART':
      return <Heart className="w-4 h-4 text-white" />;
    default:
      // Fallback for any other icons (emojis)
      return <span className="text-sm">{icon}</span>;
  }
};

const Notification = ({ name, description, icon, color, time, isLogo }: Item) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[350px] cursor-pointer overflow-hidden rounded-2xl p-3 mb-1",
        "transition-all duration-200 ease-in-out hover:scale-[103%]",
        "bg-white/10 backdrop-blur-md border border-white/20",
        "dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)]",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            isLogo && icon === "GOOGLE" ? "bg-white" : ""
          )}
          style={{
            backgroundColor: isLogo && icon === "GOOGLE" ? "#ffffff" : color,
          }}
        >
          {renderIcon(icon)}
        </div>
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center whitespace-pre text-sm font-medium text-white">
            <span className="text-xs sm:text-sm">{name}</span>
            <span className="mx-1">·</span>
            <span className="text-xs text-gray-300">{time}</span>
          </figcaption>
          <p className="text-xs font-normal text-white/80">
            {description}
          </p>
        </div>
      </div>
    </figure>
  );
};

export function AnimatedNotifications({
  notifications,
  className,
}: {
  notifications: Item[];
  className?: string;
}) {
  const [displayNotifications, setDisplayNotifications] = useState<Item[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    // Set notifications directly to prevent accumulation
    setDisplayNotifications(notifications.slice(0, 5)); // Keep only last 5
  }, [notifications]);

  useEffect(() => {
    // Clear existing timers for notifications no longer displayed
    const currentIds = new Set(displayNotifications.map(n => n.id).filter(Boolean));
    timersRef.current.forEach((timer, id) => {
      if (!currentIds.has(id)) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    });

    // Auto-remove each notification after 5 seconds
    displayNotifications.forEach((notification) => {
      if (notification.id && !timersRef.current.has(notification.id)) {
        const timer = setTimeout(() => {
          setDisplayNotifications(prev =>
            prev.filter(item => item.id !== notification.id)
          );
          timersRef.current.delete(notification.id!);
        }, 5000);

        timersRef.current.set(notification.id, timer);
      }
    });

    return () => {
      // Cleanup all timers when effect runs again or component unmounts
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [displayNotifications]);

  if (displayNotifications.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-32 right-4 left-4 sm:left-auto sm:w-[380px] z-50 flex h-auto flex-col overflow-hidden",
        className,
      )}
    >
      {displayNotifications.map((item, idx) => (
        <div
          key={item.id || idx}
          className="animate-in slide-in-from-right-2 fade-in duration-300"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <Notification {...item} />
        </div>
      ))}
    </div>
  );
}