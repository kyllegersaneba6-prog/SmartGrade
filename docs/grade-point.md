# Grade Point System

> **Implementation status:** the numeric scale below is implemented in
> `frontend/src/utils/gradeCalculations.js` (`GRADE_RANGES`). The special marks
> DRP / P / F are **not implemented** — the app only accepts numeric grades.


| Grade | Equivalence | Description |
|:-----:|:-----------:|-------------|
| 1.00 | 98.00–100.00 | Excellent |
| 1.25 | 95.00–Below 98.00 | Very Good |
| 1.50 | 92.00–Below 95.00 | |
| 1.75 | 89.00–Below 92.00 | |
| 2.00 | 86.00–Below 89.00 | Satisfactory |
| 2.25 | 83.00–Below 86.00 | |
| 2.50 | 80.00–Below 83.00 | |
| 2.75 | 77.00–Below 80.00 | Fair |
| 3.00 | 75.00–Below 77.00 | |
| 5.00 | Below 75.00 | Failed due to poor performance, absences, or withdrawal without notice |
| DRP | Officially Dropped | Dropped with approved dropping slip |
| P | Passed | To be used for courses specified as having nonnumeric grades |
| F | Failed | To be used for courses specified as having nonnumeric grades |

## Implementation Status

- Numeric grades (1.00–5.00) are implemented in `frontend/src/utils/gradeCalculations.js` (`GRADE_RANGES`).
- Special marks (DRP, P, and F) are not implemented.
- The application currently accepts numeric grades only.
