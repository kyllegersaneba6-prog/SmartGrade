# Teacher-Side Computation — Step-by-Step Process

This document traces the full path from a student's raw activity scores to their final grade point and classification.

---

## Step 1: Attendance Scoring

Each attendance date creates two rows (AM/PM session), each scored:

| Input | Value | Meaning |
|-------|-------|---------|
| Attendance mark | 0 | Absent |
| Attendance mark | 1 | Late |
| Attendance mark | 2 | Present |

```
Per-student Attendance Total = sum of all attendance marks across all dates

Max Attendance Total = (number of unique date+session+type rows) × 2
```

**Example:**
A student attended 10 dates (AM only, Lecture) with marks: `2, 2, 1, 2, 2, 2, 2, 2, 2, 2`
```
Total = 2+2+1+2+2+2+2+2+2+2 = 19
Max   = 10 × 2 = 20
```

---

## Step 2: Component Total

Each grading component contains multiple activities (or is marked as `is_attendance`).

```
Component Total = sum of all activity scores for that student in that component

If component is attendance:
  Component Total = attendance computed score (from Step 1)
```

**Example — "Quizzes" component with 3 activities:**

| Activity | Student Score | Max Score |
|----------|--------------|-----------|
| Quiz 1 | 18 | 20 |
| Quiz 2 | 15 | 15 |
| Quiz 3 | 22 | 25 |

```
Component Total    = 18 + 15 + 22 = 55
Component Max Total = 20 + 15 + 25 = 60
```

---

## Step 3: Component Equivalence (Transmutation)

Converts the raw component score to a 50–100 scale.

```
Component Equiv = (Component Total / Component Max Total) × 50 + 50
```

**Continuing the example:**
```
Component Equiv = (55 / 60) × 50 + 50
                = 0.9167 × 50 + 50
                = 45.83 + 50
                = 95.83
```

---

## Step 4: Component Weighted Contribution

Each component has a weight percentage (e.g., Quizzes = 40%). The equivalence is scaled by that weight.

```
Component Weighted = (Component Equiv × Component Weight) / 100
```

**Continuing the example (Quizzes weight = 40%):**
```
Component Weighted = (95.83 × 40) / 100 = 38.33
```

---

## Step 5: Final Term Grade

A term (PRELIMS, MIDTERMS, PRE-FINALS, or FINALS) has multiple grading components. The final term grade is the sum of all their weighted contributions.

```
Final Term Grade = Σ Component Weighted (for all components in that term)
```

**Example — PRELIMS term with 4 components:**

| Component | Total | Max Total | Equiv | Weight | Weighted |
|-----------|-------|-----------|-------|--------|----------|
| Quizzes | 55 | 60 | 95.83 | 40% | 38.33 |
| Exams | 42 | 50 | 92.00 | 30% | 27.60 |
| Assignment | 28 | 30 | 96.67 | 20% | 19.33 |
| Attendance | 19 | 20 | 97.50 | 10% | 9.75 |

```
Final Term Grade = 38.33 + 27.60 + 19.33 + 9.75 = 95.01
```

---

## Step 6: Overall Final Grade (Grade Summary Page)

The Grade Summary aggregates all 4 terms with the following weights:

| Term       | Weight |
| ---------- | ------ |
| PRELIMS    | 20%    |
| MIDTERMS   | 20%    |
| PRE-FINALS | 20%    |
| FINALS     | 40%    |

```
Overall Final Grade = Σ(Term Grade × Term Weight) / Σ(Term Weight)
```

If some terms have no data, the weights of available terms are renormalized (divided by their sum).

**Example (all 4 terms present):**

| Term       | Grade | Weight | Weighted |
| ---------- | ----- | ------ | -------- |
| PRELIMS    | 95.01 | 20%    | 19.002   |
| MIDTERMS   | 88.50 | 20%    | 17.700   |
| PRE-FINALS | 91.25 | 20%    | 18.250   |
| FINALS     | 93.00 | 40%    | 37.200   |

```
Overall Final Grade = (19.002 + 17.700 + 18.250 + 37.200) / 1.00
                    = 92.15
```

---

## Step 7: Grade Point Conversion

The numeric grade is converted to a grade point using the `gradeToPoint()` function.

```
If numeric grade < 75:
  Grade Point = 5.00
  Description = "Failed"

Otherwise, scan GRADE_RANGES from top to bottom:
  If numeric grade >= threshold, return that grade point and description.
```

**Continuing the example (overall = 91.94):**
```
Scan GRADE_RANGES:
  91.94 >= 98?  No
  91.94 >= 95?  No
  91.94 >= 92?  No
  91.94 >= 89?  Yes → Grade Point = 1.75, Description = "Very Good"
```

### Full Grade Point Scale

| Step | Grade Point | Minimum Score | Upper Bound | Classification |
|------|-------------|---------------|-------------|----------------|
| 7a | 1.00 | 98.00 | 100.00 | Excellent |
| 7b | 1.25 | 95.00 | 97.99 | Very Good |
| 7c | 1.50 | 92.00 | 94.99 | Very Good |
| 7d | 1.75 | 89.00 | 91.99 | Very Good |
| 7e | 2.00 | 86.00 | 88.99 | Satisfactory |
| 7f | 2.25 | 83.00 | 85.99 | Satisfactory |
| 7g | 2.50 | 80.00 | 82.99 | Satisfactory |
| 7h | 2.75 | 77.00 | 79.99 | Fair |
| 7i | 3.00 | 75.00 | 76.99 | Fair |
| 7j | 5.00 | 0 | 74.99 | Failed |

---

## Step 8: Behavioral Analytics

The Behavioral Analytics page computes additional metrics per student for a single selected term.

### 8a. Component Performance (%)

Shows how well a student performed in each component as a percentage.

```
Component Performance = (total earned across all activities / total possible across all activities) × 100

If component is attendance:
  Performance = (student attendance score / max attendance total) × 100
```

**Example — Quizzes component:**
```
Earned:  18 + 15 + 22 = 55
Possible: 20 + 15 + 25 = 60
Performance = (55 / 60) × 100 = 91.67%
```

### 8b. Per-Activity Score Breakdown

For each activity within a component, shows the raw score and percentage.

```
Per-Activity Percentage = raw score / max score (as decimal)

Returns a list of { activity, score, percentage } for every activity the student attempted.
```

### 8c. Submission Rate

Measures how many activities a student submitted (scored non-zero) out of the total.

```
Submission Rate = number of activities with non-zero score / total number of activities

If component is attendance:
  Submission Rate = student attendance score / max attendance total
```

**Example — Quizzes component with 3 activities:**
```
Quiz 1: score = 18 (non-zero ✓)
Quiz 2: score = 15 (non-zero ✓)
Quiz 3: score =  0 (zero ✗)

Submission Rate = 2 / 3 = 0.67 (67%)
```

A value of `0` means nothing was submitted; `1` means everything was submitted.

### 8d. Performance Trend

Analyzes whether a student is improving, declining, or staying stable across activities within a component. Uses **linear regression** (simple slope calculation).

```
Step 1: Get per-activity percentage scores in order:
  values = [pct1, pct2, pct3, ...]

Step 2: Create index positions:
  indices = [0, 1, 2, ...]

Step 3: Calculate means:
  meanX = average of indices
  meanY = average of values

Step 4: Calculate slope:
  numerator   = Σ((index[i] - meanX) × (value[i] - meanY))
  denominator = Σ((index[i] - meanX)²)

  slope = numerator / denominator

Step 5: Determine trend:
  If denominator = 0 or fewer than 2 activities → "stable"
  If slope > (meanY × 0.05) → "improving"
  If slope < -(meanY × 0.05) → "declining"
  Otherwise → "stable"
```

**Example — 3 quiz scores over time:**
```
Quiz 1: 70%
Quiz 2: 80%
Quiz 3: 90%

values = [0.70, 0.80, 0.90]
indices = [0, 1, 2]
meanX = 1.0
meanY = 0.80

numerator   = (0-1)(0.70-0.80) + (1-1)(0.80-0.80) + (2-1)(0.90-0.80)
            = (-1)(-0.10) + (0)(0) + (1)(0.10) = 0.10 + 0 + 0.10 = 0.20
denominator = (-1)² + (0)² + (1)² = 1 + 0 + 1 = 2
slope       = 0.20 / 2 = 0.10

threshold = 0.80 × 0.05 = 0.04
0.10 > 0.04 → "improving" ↑
```

The student is **improving** because their scores trend upward across activities.

### 8e. Overall Submission Rate

Average submission rate across all components.

```
Overall Submission Rate = average of each component's submission rate

Only includes components that have activities or are attendance-based.
```

### 8f. Attendance Rate

Simply the ratio of attendance score to maximum.

```
Attendance Rate = student attendance score / max attendance total

If max total is 0, returns 0.
```

### 8g. Overall Performance (Raw %)

Total earned points divided by total possible points across ALL components.

```
Overall Performance = (total earned across all activities + attendance) / (total possible across all activities + attendance) × 100
```

This differs from `getFinalGrade()` because it uses raw earned/possible ratios rather than the transmuted (50–100) equivalence scale.

**Example:**
```
All components combined:
  Total Earned  = 55 + 42 + 28 + 19 = 144
  Total Possible = 60 + 50 + 30 + 20 = 160

Overall Performance = (144 / 160) × 100 = 90.00%
```

---

## Special Marks (Non-Numeric)

Some courses use non-numeric grades. These bypass all computation:

| Mark | Meaning |
|------|---------|
| DRP | Officially Dropped (with approved dropping slip) |
| P | Passed (non-numeric course) |
| F | Failed (non-numeric course) |

---

## Full Worked Example (End-to-End)

**Student:** Juan Dela Cruz
**Term:** PRELIMS
**Components:** Quizzes (40%), Exams (30%), Assignments (20%), Attendance (10%)

```
Step 1 — Attendance:
  10 dates attended, scores: [2,2,2,1,2,2,2,2,2,2]
  Attendance Total = 19 / 20

Step 2 — Component Totals:
  Quizzes:     55 / 60
  Exams:       42 / 50
  Assignments: 28 / 30
  Attendance:  19 / 20

Step 3 — Equivalence:
  Quizzes:     (55/60) × 50 + 50 = 95.83
  Exams:       (42/50) × 50 + 50 = 92.00
  Assignments: (28/30) × 50 + 50 = 96.67
  Attendance:  (19/20) × 50 + 50 = 97.50

Step 4 — Weighted:
  Quizzes:     95.83 × 40 / 100 = 38.33
  Exams:       92.00 × 30 / 100 = 27.60
  Assignments: 96.67 × 20 / 100 = 19.33
  Attendance:  97.50 × 10 / 100 =  9.75

Step 5 — Term Grade:
  PRELIMS Grade = 38.33 + 27.60 + 19.33 + 9.75 = 95.01

Step 6 — Overall (after all 4 terms):
  Overall = PRELIMS×0.20 + MIDTERMS×0.20 + PRE-FINALS×0.20 + FINALS×0.40

Step 7 — Grade Point:
  95.01 → 1.25 — "Very Good"
```

---

## Implementation Reference

All computation functions live in `frontend/src/utils/gradeCalculations.js`
and are imported by `GradeSummary.jsx`, `ClassRecord.jsx`, and `BehavioralAnalytics.jsx`.

| Function | Input | Output | Formula |
|----------|-------|--------|---------|
| `getComponentTotal()` | studentId, component, scores, attScores | number | Sum of scores for all activities in component |
| `getComponentMaxTotal()` | component, attScores | number | Sum of max_scores for all activities |
| `getComponentEquiv()` | studentId, component, scores, attScores | number | `(total / maxTotal) * 50 + 50` |
| `getComponentWeighted()` | studentId, component, scores, attScores | number | `(equiv * weight) / 100` |
| `getFinalGrade()` | studentId, components, scores, attScores | number | Sum of all component weighted values |
| `gradeToPoint()` | numeric grade | `{ gp, desc }` | Lookup in `GRADE_RANGES` array |
