import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Star, StarIcon } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { apiClient } from '../lib/api';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: string;
  onFeedbackSubmitted?: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  complaintId,
  onFeedbackSubmitted
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { toast } = useToast();

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleRatingHover = (hoveredRating: number) => {
    setHoveredRating(hoveredRating);
  };

  const handleRatingLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting feedback.",
        variant: "destructive"
      });
      return;
    }

    if (!note.trim()) {
      toast({
        title: "Note Required",
        description: "Please provide a note about your feedback.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.createFeedback({
        complaintId,
        rating,
        note: note.trim()
      });

      if (response.success) {
        toast({
          title: "Feedback Submitted",
          description: "Your feedback has been submitted successfully.",
        });
        
        // Reset form
        setRating(0);
        setNote('');
        
        // Close modal and notify parent
        onClose();
        onFeedbackSubmitted?.();
      } else {
        throw new Error(response.message || 'Failed to submit feedback');
      }
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRating(0);
      setNote('');
      onClose();
    }
  };

  const renderStars = () => {
    const stars = [];
    const displayRating = hoveredRating || rating;

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          className="p-1 transition-colors duration-200"
          onClick={() => handleRatingClick(i)}
          onMouseEnter={() => handleRatingHover(i)}
          onMouseLeave={handleRatingLeave}
          disabled={isSubmitting}
        >
          <Star
            className={`w-8 h-8 ${
              i <= displayRating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 hover:text-yellow-300'
            } transition-colors duration-200`}
          />
        </button>
      );
    }

    return stars;
  };

  const getRatingText = () => {
    if (rating === 0) return "Select a rating";
    const ratingTexts = {
      1: "Poor",
      2: "Fair", 
      3: "Good",
      4: "Very Good",
      5: "Excellent"
    };
    return ratingTexts[rating as keyof typeof ratingTexts];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            Please rate your experience and provide feedback about the resolution of this complaint.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Section */}
          <div className="space-y-3">
            <Label htmlFor="rating" className="text-sm font-medium">
              Rating *
            </Label>
            <div className="flex items-center space-x-1">
              {renderStars()}
            </div>
            <p className="text-sm text-muted-foreground">
              {getRatingText()}
            </p>
          </div>

          {/* Note Section */}
          <div className="space-y-3">
            <Label htmlFor="note" className="text-sm font-medium">
              Feedback Note *
            </Label>
            <Textarea
              id="note"
              placeholder="Please provide your feedback about the resolution of this complaint..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[100px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {note.length}/1000 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || rating === 0 || !note.trim()}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
