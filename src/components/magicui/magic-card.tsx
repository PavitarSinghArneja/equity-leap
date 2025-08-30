import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { ReactNode, useRef, useEffect } from "react";

interface MagicCardProps {
  children: ReactNode;
  className?: string;
  gradientColor?: string;
}

export const MagicCard = ({ children, className, gradientColor }: MagicCardProps) => {
  const { theme } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    };

    card.addEventListener('mousemove', handleMouseMove);
    return () => card.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-lg bg-card text-card-foreground shadow-sm",
        // Shining border effect
        "before:absolute before:inset-0 before:rounded-lg before:p-[1px] before:opacity-0 before:transition-opacity before:duration-500",
        "before:bg-[conic-gradient(from_0deg_at_var(--mouse-x,50%)_var(--mouse-y,50%),hsl(var(--primary))_0deg,transparent_60deg,transparent_300deg,hsl(var(--primary))_360deg)]",
        "hover:before:opacity-100",
        // Inner content background
        "after:absolute after:inset-[1px] after:rounded-[calc(0.5rem-1px)] after:bg-card after:z-[1]",
        className
      )}
      style={{
        '--gradient-color': gradientColor || (theme === "dark" ? "#262626" : "#D9D9D955")
      } as React.CSSProperties}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};