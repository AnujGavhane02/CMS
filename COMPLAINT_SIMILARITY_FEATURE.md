# Complaint Similarity Detection Feature

## Overview
This feature automatically detects similar complaints and prevents duplication while escalating priority based on complaint frequency. When a user files a complaint that is similar to an existing one, the system will:

1. Detect the similarity using AI/ML-based text comparison
2. Escalate the priority of the existing complaint
3. Prevent duplicate complaint creation
4. Inform the user about the existing complaint

## How It Works

### Similarity Detection
- Uses string similarity algorithms (Dice coefficient and Jaccard similarity)
- Compares both title and description fields
- Requires complaints to be in the same department
- Uses natural language processing (NLP) for better accuracy
- 60% similarity threshold to determine if complaints are similar

### Priority Escalation
When a similar complaint is found, the system automatically escalates the priority:
- **Low** → **Medium**
- **Medium** → **High**
- **High** → **High** (remains high)

### User Experience
Instead of creating a duplicate complaint, users will:
1. Receive a notification that a similar complaint already exists
2. See details of the existing complaint (ID, status, priority)
3. Be informed if the priority was escalated
4. Be told that their concern is being addressed through the existing complaint

## Technical Implementation

### Backend
- **File**: `server/src/utils/complaintSimilarity.js`
- **Functions**:
  - `areComplaintsSimilar()` - Checks if two complaints are similar
  - `findSimilarComplaints()` - Searches database for similar complaints
  - `escalatePriority()` - Determines new priority level

- **Controller**: `server/src/controllers/complaintController.js`
  - Modified `createComplaint()` to check for similar complaints before saving
  - Returns existing complaint info if duplicate found

### Frontend
- **Component**: `client/src/components/dashboard/FileComplaint.tsx`
- **Features**:
  - Detects duplicate response from API
  - Shows informative toast notifications
  - Displays existing complaint details

### Dependencies
- `string-similarity` - For string comparison algorithms
- `natural` - For NLP and text processing

## Configuration

### Similarity Threshold
Adjustable in `createComplaint` controller:
```javascript
const similarComplaints = await findSimilarComplaints(Complaint, complaint, {
  threshold: 0.6, // Change this value (0.0 to 1.0)
  maxResults: 1
});
```

### Priority Escalation Rules
Modifiable in `complaintSimilarity.js`:
```javascript
export const escalatePriority = (currentUrgency) => {
  const priorityMap = {
    'low': 'medium',
    'medium': 'high',
    'high': 'high'
  };
  return priorityMap[currentUrgency] || currentUrgency;
};
```

## Benefits

1. **Reduces Duplicate Work**: Prevents multiple complaints about the same issue
2. **Improves Response Time**: Priority escalation ensures faster resolution
3. **Better User Experience**: Users know their concern is already being addressed
4. **Data Quality**: Maintains a cleaner, more organized complaint database
5. **Resource Efficiency**: Sub-admins don't need to handle multiple identical complaints

## Example Scenarios

### Scenario 1: New Unique Complaint
- User files: "WiFi not working in Library"
- Action: New complaint created
- Result: Normal complaint submission

### Scenario 2: Duplicate Complaint Found
- User files: "WiFi connection issues in Library"
- Existing complaint: "Library WiFi not working" (Pending, Medium priority)
- Action: 
  - No new complaint created
  - Existing complaint priority: Medium → High
  - User notified of existing complaint
- Result: User informed, priority escalated

### Scenario 3: Already High Priority
- User files: Similar complaint to existing high-priority one
- Existing complaint: "Critical system failure" (High priority)
- Action:
  - No new complaint created
  - Priority remains High (no change)
  - User notified
- Result: User informed, priority unchanged

## Performance Considerations

- Limits search to 100 most recent complaints from the same department
- Only checks unresolved complaints (pending/processing)
- Similarity calculation is efficient with O(n) complexity
- Results are sorted and limited to top matches

## Future Enhancements

Potential improvements:
1. Machine learning model for better similarity detection
2. Automatic categorization of complaints
3. Suggested responses for common issues
4. Trend analysis for recurring complaints
5. User notification when their related complaint is resolved
