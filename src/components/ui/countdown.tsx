import { useEffect, useMemo, useState } from 'react';

export const formatRemaining = (ms: number) => {
  if (ms <= 0) return 'Expired';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

export function Countdown({ to, className }: { to: string | Date; className?: string }) {
  const target = useMemo(() => (typeof to === 'string' ? new Date(to) : to), [to]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, target.getTime() - now.getTime());
  const text = formatRemaining(remaining);
  const expiringSoon = remaining > 0 && remaining < 5 * 60 * 1000; // <5m
  return (
    <span className={className}>
      {text}
      {expiringSoon && <span className="ml-1 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
    </span>
  );
}

