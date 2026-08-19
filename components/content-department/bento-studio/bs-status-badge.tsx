interface BsStatusBadgeProps {
  label: string;
  color: string;
}

export function BsStatusBadge({ label, color }: BsStatusBadgeProps) {
  return (
    <span
      className="rounded-[9px] px-[10px] py-[5px] text-[11.5px] font-bold whitespace-nowrap"
      style={{
        backgroundColor: `${color}1F`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}
