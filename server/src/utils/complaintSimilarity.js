import stringSimilarity from 'string-similarity';
import natural from 'natural';

const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Common stop words to strip before keyword matching so only meaningful words are compared
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but',
  'not', 'with', 'this', 'that', 'are', 'was', 'were', 'has', 'have', 'had', 'be', 'been',
  'being', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'my', 'your', 'our', 'their', 'its', 'from', 'by', 'as', 'up', 'about', 'into', 'through',
  'i', 'me', 'we', 'us', 'he', 'she', 'they', 'them', 'him', 'her', 'so', 'if', 'then',
  'than', 'when', 'where', 'which', 'who', 'how', 'what', 'there', 'here', 'please', 'also',
  'just', 'very', 'too', 'more', 'some', 'any', 'all', 'no', 'yes', 'now', 'get', 'got',
  'am', 'im', 'its', 'it', 'since', 'been', 'still', 'need', 'want', 'like'
]);

// Lowercase, strip punctuation and extra whitespace
const normalizeText = (text) =>
  text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Tokenize, remove stop words, and stem — returns a Set of meaningful stems
const getMeaningfulStems = (text) => {
  const tokens = tokenizer.tokenize(normalizeText(text)) || [];
  const filtered = tokens.filter(t => t.length > 2 && !STOP_WORDS.has(t));
  return new Set(filtered.map(t => stemmer.stem(t)));
};

// Compute a combined similarity score for two text strings.
// Returns a value in [0, 1].
const calculateSimilarity = (text1, text2) => {
  if (!text1 || !text2) return 0;

  const n1 = normalizeText(text1);
  const n2 = normalizeText(text2);

  // Dice coefficient over character bigrams — good for surface-level similarity
  const diceSimilarity = stringSimilarity.compareTwoStrings(n1, n2);

  // Jaccard over stemmed, stop-word-filtered keywords — captures semantic overlap
  const stems1 = getMeaningfulStems(text1);
  const stems2 = getMeaningfulStems(text2);

  let jaccardSimilarity = 0;
  if (stems1.size > 0 || stems2.size > 0) {
    const intersection = new Set([...stems1].filter(x => stems2.has(x)));
    const union = new Set([...stems1, ...stems2]);
    jaccardSimilarity = intersection.size / union.size;
  }

  // Dice weighted slightly lower; Jaccard captures more semantic meaning
  return diceSimilarity * 0.55 + jaccardSimilarity * 0.45;
};

// Check if two complaints are similar enough to be considered duplicates.
export const areComplaintsSimilar = (complaint1, complaint2, threshold = 0.7) => {
  try {
    // Complaints in different departments are never duplicates of each other
    const dept1 = complaint1.department?.toString();
    const dept2 = complaint2.department?.toString();
    if (dept1 !== dept2) {
      return { isSimilar: false, similarity: 0 };
    }

    const titleSimilarity = calculateSimilarity(complaint1.title, complaint2.title);
    const descSimilarity = calculateSimilarity(complaint1.description, complaint2.description);

    // High-confidence title match: if both titles share ≥85% bigram similarity the
    // complaints are almost certainly the same issue regardless of description wording
    if (titleSimilarity >= 0.85) {
      return {
        isSimilar: true,
        similarity: Math.max(titleSimilarity, threshold),
        titleSimilarity,
        descSimilarity,
        threshold,
        reason: 'title_match'
      };
    }

    // Weighted combined score — description carries more weight because it's more detailed
    const combinedSimilarity = titleSimilarity * 0.35 + descSimilarity * 0.65;

    // Small bonus when complaints share the same category — narrows false positives
    const cat1 = complaint1.category?.toLowerCase?.() ?? '';
    const cat2 = complaint2.category?.toLowerCase?.() ?? '';
    const categoryBonus = cat1 && cat2 && cat1 === cat2 ? 0.05 : 0;

    const finalSimilarity = Math.min(1, combinedSimilarity + categoryBonus);

    return {
      isSimilar: finalSimilarity >= threshold,
      similarity: finalSimilarity,
      titleSimilarity,
      descSimilarity,
      threshold
    };
  } catch (error) {
    console.error('Error checking complaint similarity:', error);
    return { isSimilar: false, similarity: 0 };
  }
};

// Find the most similar unresolved complaints in the database for a new complaint.
export const findSimilarComplaints = async (Complaint, newComplaint, options = {}) => {
  try {
    const {
      threshold = 0.7,
      maxResults = 5,
      department = null
    } = options;

    const query = {
      status: { $in: ['pending', 'processing'] },
      _id: { $ne: newComplaint._id }
    };

    if (department) {
      query.department = department;
    } else if (newComplaint.department) {
      query.department = newComplaint.department;
    }

    const candidateComplaints = await Complaint.find(query)
      .limit(100)
      .sort({ createdAt: -1 });

    const similarComplaints = [];

    for (const candidate of candidateComplaints) {
      const result = areComplaintsSimilar(newComplaint, candidate, threshold);

      if (result.isSimilar) {
        similarComplaints.push({
          complaint: candidate,
          similarity: result.similarity,
          titleSimilarity: result.titleSimilarity,
          descSimilarity: result.descSimilarity
        });
      }
    }

    similarComplaints.sort((a, b) => b.similarity - a.similarity);
    return similarComplaints.slice(0, maxResults);
  } catch (error) {
    console.error('Error finding similar complaints:', error);
    return [];
  }
};

// Escalate priority by a fixed step when a duplicate complaint is submitted. Cap at 10.
const ESCALATION_STEP = 2;

export const escalatePriority = (currentPriority) => {
  const num = typeof currentPriority === 'number' ? currentPriority : 5;
  return Math.min(10, Math.max(1, num + ESCALATION_STEP));
};
