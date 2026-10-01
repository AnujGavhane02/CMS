/**
 * Calculate complaint priority (1-10) from title and description.
 * Uses sentiment analysis + overall text analysis (not just keywords).
 * 1-3 = low, 4-6 = medium, 7-10 = high (for display).
 *
 * Libraries used:
 * - sentiment: AFINN-based sentiment analysis for overall tone/intensity
 * - Keyword signals as secondary adjustments
 */

import Sentiment from 'sentiment';

const sentiment = new Sentiment();

// Urgency boost keywords (secondary signal - sentiment handles overall tone)
const HIGH_PRIORITY_WORDS = [
  'urgent', 'emergency', 'critical', 'asap', 'immediately', 'right away',
  'broken', 'not working', 'down', 'offline', 'failed', 'failure', 'error',
  'danger', 'dangerous', 'unsafe', 'blocking', 'blocked',
  'cannot', 'unable', 'stuck', 'fix asap', 'extremely', 'very urgent'
];

// Low-priority phrasing (reduces calculated priority)
const LOW_PRIORITY_WORDS = [
  'whenever', 'when you can', 'no rush', 'minor', 'suggestion', 'feedback',
  'optional', 'low priority', 'when possible', 'at your convenience',
  'small', 'slight', 'cosmetic', 'improvement'
];

/**
 * Calculate priority (1-10) from overall title + description using sentiment analysis.
 * Combines: sentiment (overall tone), intensity, keyword signals, punctuation.
 *
 * @param {string} title
 * @param {string} description
 * @returns {number} 1-10
 */
export function calculatePriorityFromText(title = '', description = '') {
  const text = `${String(title)} ${String(description)}`.trim();
  if (!text) return 5;

  const textLower = text.toLowerCase();

  // 1. Sentiment analysis - overall tone of the complaint
  // Negative sentiment = user frustrated/upset = higher priority
  // Score typically -5 (very negative) to +5 (positive)
  const sentimentResult = sentiment.analyze(text);
  const sentimentScore = sentimentResult.score || 0;
  const comparative = sentimentResult.comparative || 0; // intensity per word

  // Map sentiment to priority: negative → high (7-10), neutral → medium (5), positive → low (1-3)
  // sentimentScore -5 → want priority ~9, 0 → 5, +5 → want priority ~2
  const sentimentContribution = -sentimentScore * 0.7; // -5→+3.5, 0→0, +5→-3.5

  // Comparative: stronger negative per word = more urgent (e.g. "terrible horrible" vs "bad")
  const intensityBonus = comparative < -0.3 ? 0.5 : comparative < -0.1 ? 0.2 : 0;

  // 2. Keyword-based adjustments (secondary - complements sentiment)
  let keywordAdjustment = 0;
  for (const word of HIGH_PRIORITY_WORDS) {
    if (textLower.includes(word)) {
      keywordAdjustment += 0.4;
      break; // Cap per category
    }
  }
  for (const word of LOW_PRIORITY_WORDS) {
    if (textLower.includes(word)) {
      keywordAdjustment -= 1;
      break;
    }
  }

  // 3. Punctuation - exclamation marks suggest urgency
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations >= 3) keywordAdjustment += 0.5;
  else if (exclamations >= 1) keywordAdjustment += 0.2;

  // 4. Text length - very detailed/long complaints may indicate severity
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lengthBonus = wordCount > 150 ? 0.3 : wordCount > 80 ? 0.1 : 0;

  // Combine: base 5, add contributions
  let score = 5 + sentimentContribution + intensityBonus + keywordAdjustment + lengthBonus;

  // Clamp to 1-10
  return Math.max(1, Math.min(10, Math.round(score)));
}

/**
 * Map priority number (1-10) to urgency label for display.
 * 1-3 = low, 4-6 = medium, 7-10 = high
 *
 * @param {number} priority
 * @returns {'low'|'medium'|'high'}
 */
export function priorityToUrgency(priority) {
  if (priority == null || typeof priority !== 'number') return 'medium';
  if (priority <= 3) return 'low';
  if (priority <= 6) return 'medium';
  return 'high';
}

/**
 * Map urgency label to priority range for DB queries.
 *
 * @param {'low'|'medium'|'high'} urgency
 * @returns {{ $gte: number, $lte: number }|null}
 */
export function urgencyToPriorityRange(urgency) {
  if (!urgency) return null;
  switch (urgency.toLowerCase()) {
    case 'low': return { $gte: 1, $lte: 3 };
    case 'medium': return { $gte: 4, $lte: 6 };
    case 'high': return { $gte: 7, $lte: 10 };
    default: return null;
  }
}
