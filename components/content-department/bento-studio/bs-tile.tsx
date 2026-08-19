import { cn } from "@/lib/utils";

type TileVariant = "white" | "dark" | "gradient";

interface BsTileProps {
  variant?: TileVariant;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<TileVariant, string> = {
  white: "bg-[#FFFFFF] text-[#15151A]",
  dark: "bg-[#17171F] text-white",
  gradient: "text-white",
};

export function BsTile({ variant = "white", className, children }: BsTileProps) {
  return (
    <div
      className={cn("rounded-[28px] p-[26px]", variantStyles[variant], className)}
      style={
        variant === "gradient"
          ? { background: "linear-gradient(120deg, #5B4BFF 0%, #8B5CF6 55%, #FF6B4A 100%)", padding: 32 }
          : undefined
      }
    >
      {children}
    </div>
  );
}
