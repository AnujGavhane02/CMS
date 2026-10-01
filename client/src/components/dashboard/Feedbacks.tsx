import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MessageSquare, Tag, User, Calendar, AlertCircle, Sparkles, Loader2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import { DataService } from "@/lib/dataService";
import { useAuth } from "@/contexts/AuthContext";

interface FeedbackItem {
  _id: string;
  feedbackId: string;
  rating: number;
  note: string;
  sentiment: {
    category: "Positive" | "Neutral" | "Negative";
    score: number;
    confidence: number;
  };
  isVisible: boolean;
  user: {
    name: string;
    email: string;
  };
  department: {
    name: string;
  };
  complaint?: {
    complaintId: string;
    title: string;
    urgency: string;
  };
  createdAt: string;
}

const ITEMS_PER_PAGE = 10;

export const Feedbacks = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFeedbacks, setTotalFeedbacks] = useState(0);

  useEffect(() => {
    fetchFeedbacks();
  }, [currentPage, ratingFilter, sentimentFilter]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };

      if (ratingFilter !== "all") params.rating = ratingFilter;
      if (sentimentFilter !== "all") params.sentiment = sentimentFilter;

      const response = await DataService.getAllFeedbacks(params);
      setFeedbacks(response.feedbacks || []);
      
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 1);
        setTotalFeedbacks(response.pagination.totalFeedbacks || 0);
      }
    } catch (error) {
      console.error("Failed to fetch feedbacks:", error);
      toast.error("Failed to load feedbacks");
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (value: string) => {
    setRatingFilter(value);
    setCurrentPage(1);
  };

  const handleSentimentChange = (value: string) => {
    setSentimentFilter(value);
    setCurrentPage(1);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const getSentimentVariant = (category: string) => {
    switch (category) {
      case "Positive":
        return "default";
      case "Negative":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const rangeStart = totalFeedbacks === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalFeedbacks);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Feedback Analytics</h2>
        <p className="text-muted-foreground">View and monitor user satisfaction ratings and sentiment analyses</p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <Select value={ratingFilter} onValueChange={handleRatingChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sentimentFilter} onValueChange={handleSentimentChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiments</SelectItem>
            <SelectItem value="Positive">Positive</SelectItem>
            <SelectItem value="Neutral">Neutral</SelectItem>
            <SelectItem value="Negative">Negative</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Count Info */}
      {!loading && (
        <div className="text-sm text-muted-foreground">
          Showing {rangeStart}–{rangeEnd} of {totalFeedbacks} feedbacks
        </div>
      )}

      {/* Feedbacks Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading feedbacks...</span>
        </div>
      ) : feedbacks.length > 0 ? (
        <div className="grid gap-4">
          {feedbacks.map((item) => (
            <Card key={item._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-muted-foreground">
                      {item.feedbackId || `FB-${item._id.slice(-6).toUpperCase()}`}
                    </span>
                    <Badge variant={getSentimentVariant(item.sentiment?.category || "Neutral")}>
                      {item.sentiment?.category || "Neutral"}
                    </Badge>
                  </div>
                  {item.complaint && (
                    <h3 className="font-semibold text-base mt-1">
                      Re: {item.complaint.title}
                      <span className="text-xs font-mono text-muted-foreground ml-2 font-normal">
                        ({item.complaint.complaintId})
                      </span>
                    </h3>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {renderStars(item.rating)}
                  <span className="text-xs text-muted-foreground">
                    Rating: {item.rating}/5
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Note / Comments */}
                <p className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-lg border italic">
                  "{item.note}"
                </p>

                {/* Details Footer */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span>Submitted by: <strong>{item.user?.name || "Anonymous"}</strong> ({item.user?.email || "—"})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Department: <strong>{item.department?.name || "—"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Date: {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12 text-muted-foreground">
          <CardContent className="space-y-3">
            <MessageSquare className="h-12 w-12 mx-auto opacity-50" />
            <p className="text-base font-medium">No feedback entries found</p>
            <p className="text-sm">There are currently no resolved complaints with feedback matching your criteria.</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-4">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium mx-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
