import { Complaint } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge-variants";
import { Clock, User, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ComplaintCardProps {
  complaint: Complaint;
  onClick?: () => void;
  showUser?: boolean;
}

export const ComplaintCard = ({ complaint, onClick, showUser = false }: ComplaintCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{complaint.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {complaint.description}
            </p>
          </div>
          <StatusBadge status={complaint.status}>
            {complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1)}
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          {showUser ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{complaint.isAnonymous ? "Anonymous" : complaint.userName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{complaint.isAnonymous ? "Anonymous" : complaint.userName}</span>
            </div>
          )}
          <StatusBadge urgency={complaint.urgency}>
            {complaint.urgency.charAt(0).toUpperCase() + complaint.urgency.slice(1)}
            {typeof complaint.priority === "number" ? ` (${complaint.priority})` : ""}
          </StatusBadge>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1 flex-wrap">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              {typeof complaint.department === 'object' && complaint.department && 'name' in complaint.department
                ? (complaint.department as { name: string }).name
                : String(complaint.department || "")}
              {complaint.category ? ` · ${complaint.category}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDistanceToNow(complaint.createdAt, { addSuffix: true })}</span>
          </div>
        </div>
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            ID: <span className="font-mono font-medium">{complaint.complaintId || complaint.id}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
