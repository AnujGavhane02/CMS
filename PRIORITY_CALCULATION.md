# Complaint Priority Calculation

This document explains how complaint priority is calculated when a user files a complaint in the system.

## Overview

- **Priority** is stored as a number from **1 to 10**
- **Display labels** (urgency): 1-3 = Low, 4-6 = Medium, 7-10 = High
- Priority is **automatically calculated** from the complaint's **title and description**—users do not select it manually

## How Priority is Calculated

The system uses **sentiment analysis** and **overall text analysis** (not just keywords) to determine priority. The calculation combines multiple factors:

### 1. Sentiment Analysis (Primary Factor)

Uses the [sentiment](https://www.npmjs.com/package/sentiment) library (AFINN-165 wordlist) to analyze the overall tone of the text.

- **Negative sentiment** (frustrated, upset, angry) → **higher priority** (7-10)
- **Neutral sentiment** → **medium priority** (4-6)
- **Positive or mild sentiment** → **lower priority** (1-3)

The sentiment score (typically -5 to +5) is mapped inversely to priority: more negative = more urgent.

### 2. Intensity Bonus

The *comparative* score (sentiment per word) captures how strongly negative the language is:

- **Strongly negative** (e.g., "terrible", "horrible", "awful") → +0.5
- **Moderately negative** → +0.2
- **Neutral or positive** → no bonus

### 3. Keyword Adjustments (Secondary)

High-priority phrases add urgency:
- *"urgent"*, *"emergency"*, *"critical"*, *"asap"*, *"immediately"*, *"broken"*, *"not working"*, *"down"*, *"offline"*, *"failed"*, *"error"*, *"danger"*, *"cannot"*, *"unable"*, *"stuck"*, etc.  
- **Effect:** +0.4

Low-priority phrases reduce urgency:
- *"whenever"*, *"when you can"*, *"no rush"*, *"minor"*, *"suggestion"*, *"feedback"*, *"optional"*, *"when possible"*, *"at your convenience"*, *"small"*, *"cosmetic"*, etc.  
- **Effect:** -1

### 4. Punctuation

- **3 or more exclamation marks** → +0.5  
- **1–2 exclamation marks** → +0.2  

### 5. Text Length

- **>150 words** → +0.3 (very detailed complaints may indicate severity)
- **>80 words** → +0.1
- **Shorter** → no bonus

### 6. Base and Clamping

- **Base score:** 5 (medium)
- All contributions are added, then **rounded** and **clamped** to 1–10

---

## Display Mapping

| Priority | Urgency Label |
|----------|---------------|
| 1, 2, 3  | Low           |
| 4, 5, 6  | Medium        |
| 7, 8, 9, 10 | High       |

On the frontend, complaints show both the label (e.g., "High") and the number (e.g., "High (8)").

---

## Duplicate Complaints

When a **similar complaint** is found (same department, similar title/description), the system:

1. Does **not** create a new complaint
2. **Escalates** the priority of the existing complaint by **+2** (capped at 10)
3. Informs the user that a similar complaint exists and that its priority has been increased

**Example:** A complaint at priority 5 → 7 → 9 → 10 with repeated similar submissions.

---

## Implementation Location

- **Calculation logic:** `server/src/utils/complaintPriority.js`
- **Duplicate detection & escalation:** `server/src/utils/complaintSimilarity.js`
