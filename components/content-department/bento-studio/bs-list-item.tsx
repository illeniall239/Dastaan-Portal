import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BsListItemProps {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  href?: string;
  className?: string;
}

export function BsListItem({
  icon: Icon,
  iconColor = "#FF6B4A",
  title,
  subtitle,
  trailing,
  href,
  className,
}: BsListItemProps) {
  const content = (
    <>
      {Icon && (
        <div className="w-[34px] h-[34px] rounded-[11px] bg-white flex items-center justify-center flex-shrink-0">
          <Icon className="w-[15px] h-[15px]" style={{ color: iconColor }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#15151A] truncate">{title}</p>
        {subtitle && (
          <p className="text-[11.5px] text-[#7B7B85] truncate">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="flex items-center gap-2 flex-shrink-0">{trailing}</div>}
    </>
  );

  const itemClass = cn(
    "flex items-center gap-3 rounded-[16px] bg-[#F8F8F5] px-[14px] py-[12px] transition-colors",
    href && "hover:bg-[#F0F0ED] cursor-pointer",
    className
  );

  if (href) {
    return <Link href={href} className={itemClass}>{content}</Link>;
  }

  return <div className={itemClass}>{content}</div>;
}
