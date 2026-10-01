import { ComplaintStatus } from "@/lib/types";
import { Check, Clock, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusProgressProps {
  currentStatus: ComplaintStatus;
  className?: string;
}

const statuses: { key: ComplaintStatus; label: string; icon: any }[] = [
  { key: "pending", label: "Submitted", icon: Clock },
  { key: "processing", label: "Processing", icon: Loader2 },
  { key: "resolved", label: "Resolved", icon: Check },
];

export const StatusProgress = ({ currentStatus, className }: StatusProgressProps) => {
  const currentIndex = statuses.findIndex((s) => s.key === currentStatus);

  if (currentStatus === "rejected") {
    return (
      <div className={cn("flex items-center justify-center gap-2 text-destructive", className)}>
        <XCircle className="h-6 w-6" />
        <span className="font-semibold">Complaint Rejected</span>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-border -z-10">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{
              width: `${(currentIndex / (statuses.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Status Steps */}
        {statuses.map((status, index) => {
          const Icon = status.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={status.key} className="flex flex-col items-center gap-2 flex-1">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                  isCompleted && "bg-success text-success-foreground",
                  isCurrent && "bg-primary text-primary-foreground animate-pulse",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isCurrent && "animate-spin")} />
              </div>
              <span
                className={cn(
                  "text-sm font-medium text-center",
                  (isCompleted || isCurrent) && "text-foreground",
                  isPending && "text-muted-foreground"
                )}
              >
                {status.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
