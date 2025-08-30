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
        "relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-500",
        "before:bg-[radial-gradient(600px_circle_at_var(--mouse-x)_var(--mouse-y),var(--gradient-color),transparent_40%)]",
        "hover:before:opacity-100",
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