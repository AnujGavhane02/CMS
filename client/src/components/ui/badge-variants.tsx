import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      status: {
        pending: "bg-warning/10 text-warning border border-warning/20",
        processing: "bg-info/10 text-info border border-info/20",
        resolved: "bg-success/10 text-success border border-success/20",
        rejected: "bg-destructive/10 text-destructive border border-destructive/20",
      },
      urgency: {
        low: "bg-muted text-muted-foreground",
        medium: "bg-warning/10 text-warning border border-warning/20",
        high: "bg-destructive/10 text-destructive border border-destructive/20",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {}

export function StatusBadge({ className, status, urgency, ...props }: StatusBadgeProps) {
  return (
    <div className={cn(statusBadgeVariants({ status, urgency }), className)} {...props} />
  );
}
