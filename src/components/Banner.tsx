import { STATUS_COLOR } from "@/lib/colors";

interface BannerProps {
  status: "warning" | "critical" | "good";
  title: string;
  children: React.ReactNode;
}

const ICON: Record<BannerProps["status"], string> = {
  warning: "⚠", // ⚠
  critical: "✖", // ✖
  good: "✓", // ✓
};

const BG: Record<BannerProps["status"], string> = {
  warning: "#33280b",
  critical: "#341515",
  good: "#0f2e1a",
};

export default function Banner({ status, title, children }: BannerProps) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: BG[status], borderColor: STATUS_COLOR[status] + "40" }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: STATUS_COLOR[status] }}
          aria-hidden
        >
          {ICON[status]}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          <div className="mt-1 text-sm text-slate-200">{children}</div>
        </div>
      </div>
    </div>
  );
}
