import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Star, StarIcon, MessageSquare, Calendar, User } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { apiClient } from '../lib/api';

interface Feedback {
  _id: string;
  rating: number;
  note: string;
  sentiment: {
    score: number;
    category: 'Positive' | 'Neutral' | 'Negative';
    confidence: number;
  };
  user: {
    name: string;
    email: string;
  };
  createdAt: string;
  isVisible: boolean;
}

interface FeedbackStats {
  totalFeedbacks: number;
  averageRating: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  ratingDistribution: Array<{
    rating: number;
    sentiment: string;
  }>;
}

interface FeedbackListProps {
  complaintId: string;
  canSubmitFeedback?: boolean;
  onFeedbackSubmitted?: () => void;
  refreshTrigger?: boolean;
}

const FeedbackList: React.FC<FeedbackListProps> = ({
  complaintId,
  canSubmitFeedback = false,
  onFeedbackSubmitted,
  refreshTrigger
}) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedbacks();
  }, [complaintId, refreshTrigger]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getComplaintFeedbacks(complaintId);
      
      if (response.success) {
        setFeedbacks(response.data.feedbacks);
        setStats(response.data.statistics);
      } else {
        throw new Error(response.message || 'Failed to fetch feedbacks');
      }
    } catch (error: any) {
      console.error('Error fetching feedbacks:', error);
      setError(error.message || 'Failed to fetch feedbacks');
      toast({
        title: "Error",
        description: "Failed to load feedbacks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    const normalizedSentiment = sentiment.toLowerCase();
    switch (normalizedSentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    const normalizedSentiment = sentiment.toLowerCase();
    switch (normalizedSentiment) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😞';
      default:
        return '😐';
    }
  };

  const getCapitalizedSentiment = (sentiment: string) => {
    const normalizedSentiment = sentiment.toLowerCase();
    switch (normalizedSentiment) {
      case 'positive':
        return 'Positive';
      case 'negative':
        return 'Negative';
      default:
        return 'Neutral';
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' = 'md') => {
    const stars = [];
    const starSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`${starSize} ${
            i <= rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          }`}
        />
      );
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="ml-2">Loading feedbacks...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchFeedbacks} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Feedback
          {stats && (
            <Badge variant="secondary" className="ml-2">
              {stats.totalFeedbacks} feedback{stats.totalFeedbacks !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        {stats && stats.totalFeedbacks > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.averageRating.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.positiveCount}
              </div>
              <div className="text-sm text-muted-foreground">Positive</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {stats.neutralCount}
              </div>
              <div className="text-sm text-muted">Neutral</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.negativeCount}
              </div>
              <div className="text-sm text-muted-foreground">Negative</div>
            </div>
          </div>
        )}

        {/* Feedbacks List */}
        {feedbacks.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No feedback has been submitted for this complaint yet.
            </p>
            {canSubmitFeedback && onFeedbackSubmitted && (
              <Button onClick={onFeedbackSubmitted} className="mt-2">
                Be the first to submit feedback
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <Card key={feedback._id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {renderStars(feedback.rating, 'sm')}
                      </div>
                      <div
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSentimentColor(feedback.sentiment.category)}`}
                      >
                        {getSentimentIcon(feedback.sentiment.category)} {getCapitalizedSentiment(feedback.sentiment.category)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(feedback.createdAt)}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {feedback.note}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{feedback.user.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {Math.round(feedback.sentiment.confidence * 100)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackList;
