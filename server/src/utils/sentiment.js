import natural from 'natural';
import Sentiment from 'sentiment';

// Initialize sentiment analyzer
const sentiment = new Sentiment();

// Configure natural language processing
const stemmer = natural.PorterStemmer;
const tokenizer = new natural.WordTokenizer();

// Analyze sentiment of text
export const analyzeSentiment = (text) => {
  try {
    if (!text || typeof text !== 'string') {
      return {
        score: 0,
        sentiment: 'neutral',
        confidence: 0
      };
    }

    // Clean and preprocess text
    const cleanText = text.toLowerCase().trim();
    
    // Get sentiment score (-5 to +5)
    const result = sentiment.analyze(cleanText);
    
    // Determine sentiment category
    let sentimentCategory = 'Neutral';
    if (result.score > 1) {
      sentimentCategory = 'Positive';
    } else if (result.score < -1) {
      sentimentCategory = 'Negative';
    }

    // Calculate confidence (0 to 1)
    const confidence = Math.min(Math.abs(result.score) / 5, 1);

    return {
      score: result.score,
      sentiment: sentimentCategory,
      confidence: confidence,
      tokens: result.tokens || [],
      words: result.words || {}
    };
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return {
      score: 0,
      sentiment: 'neutral',
      confidence: 0
    };
  }
};

// Analyze sentiment of feedback
export const analyzeFeedbackSentiment = (rating, comment) => {
  try {
    // Start with rating-based sentiment
    let sentimentScore = 0;
    let sentimentCategory = 'Neutral';

    // Rating-based sentiment (1-5 scale)
    if (rating >= 4) {
      sentimentScore += 2;
      sentimentCategory = 'Positive';
    } else if (rating <= 2) {
      sentimentScore -= 2;
      sentimentCategory = 'Negative';
    }

    // Analyze comment sentiment if provided
    if (comment && comment.trim()) {
      const commentSentiment = analyzeSentiment(comment);
      
      // Combine rating and comment sentiment
      sentimentScore = (sentimentScore + commentSentiment.score) / 2;
      
      // Override with comment sentiment if it's stronger
      if (Math.abs(commentSentiment.score) > Math.abs(sentimentScore)) {
        sentimentCategory = commentSentiment.sentiment;
      }
    }

    // Final sentiment determination
    if (sentimentScore > 0.5) {
      sentimentCategory = 'Positive';
    } else if (sentimentScore < -0.5) {
      sentimentCategory = 'Negative';
    } else {
      sentimentCategory = 'Neutral';
    }

    return {
      score: sentimentScore,
      sentiment: sentimentCategory,
      confidence: Math.min(Math.abs(sentimentScore), 1)
    };
  } catch (error) {
    console.error('Feedback sentiment analysis error:', error);
    return {
      score: 0,
      sentiment: 'neutral',
      confidence: 0
    };
  }
};

// Extract keywords from text
export const extractKeywords = (text, maxKeywords = 10) => {
  try {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // Tokenize and clean text
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);

    // Filter out stop words and short words
    const filteredTokens = tokens.filter(token => 
      token.length > 2 && !stopWords.has(token)
    );

    // Count word frequency
    const wordCount = {};
    filteredTokens.forEach(token => {
      const stemmed = stemmer.stem(token);
      wordCount[stemmed] = (wordCount[stemmed] || 0) + 1;
    });

    // Sort by frequency and return top keywords
    const keywords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word, count]) => ({ word, count }));

    return keywords;
  } catch (error) {
    console.error('Keyword extraction error:', error);
    return [];
  }
};

// Analyze complaint sentiment and extract insights
export const analyzeComplaintInsights = (title, description) => {
  try {
    const fullText = `${title} ${description}`.trim();
    
    // Analyze sentiment
    const sentiment = analyzeSentiment(fullText);
    
    // Extract keywords
    const keywords = extractKeywords(fullText);
    
    // Determine urgency indicators
    const urgencyIndicators = [
      'urgent', 'emergency', 'critical', 'immediate', 'asap', 'quickly', 'fast',
      'broken', 'not working', 'down', 'offline', 'error', 'problem', 'issue'
    ];
    
    const hasUrgencyIndicators = urgencyIndicators.some(indicator => 
      fullText.toLowerCase().includes(indicator)
    );

    // Determine emotional indicators
    const emotionalIndicators = {
      frustration: ['frustrated', 'angry', 'annoyed', 'upset', 'disappointed'],
      satisfaction: ['happy', 'satisfied', 'pleased', 'good', 'excellent'],
      concern: ['worried', 'concerned', 'anxious', 'nervous', 'scared']
    };

    const detectedEmotions = [];
    Object.entries(emotionalIndicators).forEach(([emotion, indicators]) => {
      if (indicators.some(indicator => fullText.toLowerCase().includes(indicator))) {
        detectedEmotions.push(emotion);
      }
    });

    return {
      sentiment,
      keywords,
      hasUrgencyIndicators,
      detectedEmotions,
      textLength: fullText.length,
      wordCount: fullText.split(/\s+/).length
    };
  } catch (error) {
    console.error('Complaint insights analysis error:', error);
    return {
      sentiment: { score: 0, sentiment: 'neutral', confidence: 0 },
      keywords: [],
      hasUrgencyIndicators: false,
      detectedEmotions: [],
      textLength: 0,
      wordCount: 0
    };
  }
};
