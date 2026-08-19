import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BsStatCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; positive: boolean };
  icon: LucideIcon;
  iconColor?: string;
  href?: string;
}

export function BsStatCard({
  label,
  value,
  delta,
  icon: Icon,
  iconColor = "#5B4BFF",
  href,
}: BsStatCardProps) {
  const content = (
    <div className="flex flex-col h-full min-h-[114px]">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-semibold text-[#7B7B85]">{label}</span>
        <div
          className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${iconColor}1A` }}
        >
          <Icon className="w-[15px] h-[15px]" style={{ color: iconColor }} />
        </div>
      </div>

      <div className="mt-auto flex items-end gap-2">
        <span className="text-[42px] font-extrabold leading-none text-[#15151A]">
          {value}
        </span>
        {delta && (
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1 mb-1"
            style={{ backgroundColor: delta.positive ? "#12B8861A" : "#FF6B4A1A" }}
          >
            {delta.positive ? (
              <TrendingUp className="w-[11px] h-[11px]" style={{ color: delta.positive ? "#12B886" : "#FF6B4A" }} />
            ) : (
              <TrendingDown className="w-[11px] h-[11px]" style={{ color: "#FF6B4A" }} />
            )}
            <span
              className="text-[11.5px] font-bold"
              style={{ color: delta.positive ? "#12B886" : "#FF6B4A" }}
            >
              {delta.value}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const wrapperClass = cn(
    "rounded-[24px] bg-white p-[22px] transition-shadow hover:shadow-md"
  );

  if (href) {
    return (
      <Link href={href} className={cn(wrapperClass, "block")}>
        {content}
      </Link>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}
