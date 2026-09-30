# Teacher Analytics — AI Student Performance Summary

## 1. Overview

We are adding an AI-powered student analysis feature to:

`teacher/analytics`

The purpose is to allow a teacher to click a button such as:

**"Summarize Student Behaviour with AI"**

The system will collect the student's existing academic/performance data from the application, send the structured data via the OmniRoute AI gateway (Configured Combo → Antigravity provider → Claude Sonnet 4.6), and have the AI generate:

- A concise student performance summary
- Strengths
- Areas that need attention
- Learning/performance patterns
- Suggested teacher actions
- Suggested follow-up actions

The AI must NOT be responsible for calculating grades.

The existing application remains the source of truth for all grades, percentages, weights, attendance records, and other numerical data.

---

# 2. Core Architecture

Final provider architecture (development/demo):

    SmartGrade Frontend (teacher/analytics)
        ↓
    SmartGrade Backend
        ↓
    AIService
        ↓
    OmniRoute (local OpenAI-compatible API at http://localhost:20128/v1)
        ↓
    Configured Combo
        ↓
    Antigravity provider
        ↓
    Claude Sonnet 4.6
        ↓
    Structured JSON
        ↓
    SmartGrade Backend (validate)
        ↓
    teacher/analytics UI

The intended flow is:

Teacher
  ↓
teacher/analytics
  ↓
Select student
  ↓
Click "Summarize Student Behaviour with AI"
  ↓
Frontend sends existing studentAnalytics object as AI input (MVP — no grading recalculation)
  ↓
Backend (AIService) forwards sanitized structured data to OmniRoute
  ↓
OmniRoute routes via Configured Combo → Antigravity → Claude Sonnet 4.6
  ↓
AI returns structured JSON
  ↓
Backend validates JSON before returning it
  ↓
Frontend displays the AI-generated report

Conceptually:

    Teacher
       |
       v
teacher/analytics
       |
       | "Summarize with AI"
       v
Backend
       |
       | existing studentAnalytics object (MVP input, source of truth)
       v
Structured Student Data
       |
       v
AIService → OmniRoute → Configured Combo → Antigravity → Claude Sonnet 4.6
       |
       +--> Summary
       +--> Strengths
       +--> Areas of Concern
       +--> Patterns
       +--> Suggested Actions
       +--> Follow-up
       |
       v
Teacher-facing AI Report

Rules:
- The backend communicates with OmniRoute, never the frontend.
- The AI provider remains abstracted behind AIService.
- Do not hard-code Claude-specific logic into BehavioralAnalytics.jsx.
- The model / Combo name is configurable through environment variables, not hard-coded.
- The AI is read-only and must never modify grades or student records.
- Do not implement AI report persistence yet.
- The application must continue working normally if OmniRoute or the AI provider is unavailable.

---

# 3. Important Principle

The AI is an INTERPRETATION layer.

The application is the SOURCE OF TRUTH.

Do NOT allow the AI to independently calculate or modify grades.

For example, if the backend says:

    exam_score: 75
    exam_total: 100
    exam_performance: 75%

The AI should interpret that information.

It should NOT recalculate the student's final grade and should NOT invent a different value.

The final grade should always come from the existing grading system.

---

# 4. Feature Location

This feature belongs in:

    teacher/analytics

The existing student analytics/performance interface should be enhanced with an AI action.

Example:

    Student: Ali, Noah Z.

    [ Summarize Student Behaviour with AI ]

When clicked:

1. Show loading state.
2. Backend retrieves the student's performance data.
3. Backend sends the structured data to the AI service.
4. AI generates the analysis.
5. Frontend displays the result in a clean teacher-friendly panel/modal.

---

# 5. Example Student Data

The screenshot that motivated this feature contains information similar to:

Student:

    Ali, Noah Z.
    Student ID: 22-3146-264

Overall:

    Final Grade: 90.17
    Subject Rate: 91.7%
    Attendance Rate: 66.7%
    Overall Performance: 82.9%

Categories:

Attendance:
    Weight: 10%
    Equivalent: 83.33
    Performance: 66.7%
    Attendance: 4 / 6

Quiz:
    Weight: 10%
    Equivalent: 95.83
    Performance: 91.7%

    Q1: 25 / 30 = 83%
    Q2: 30 / 30 = 100%

    Trend: improving

PT:
    Weight: 30%
    Equivalent: 95.00
    Performance: 90%

    PT1: 45 / 50 = 90%

Exam:
    Weight: 50%
    Equivalent: 87.50
    Performance: 75%

    Exam: 75 / 100 = 75%

---

# 6. Backend Data Function

For MVP, use the existing `studentAnalytics` object as the AI input.

The frontend (`BehavioralAnalytics.jsx`) already computes `finalGrade`, `equiv`,
`performance`, `trend`, `total`, `maxTotal`, and per-activity scores from the
existing grading system. Reuse that object as the POST body to the new backend
endpoint (e.g. `POST /api/ai/summarize-student`).

Do NOT duplicate the existing grading calculation logic server-side for MVP.

Long-term, an optional backend function/service similar to:

    getStudentAcademicProfile(studentId)

may retrieve the relevant information from the database. For MVP this is
deferred to avoid duplicating `gradeCalculations.js` logic.

The AI should NOT directly query the database.

Instead:

    Frontend studentAnalytics (source of truth)
       ↓
    Backend sanitize + validate
       ↓
    Structured JSON
       ↓
    AIService → OmniRoute

This gives us control over exactly what information the AI receives.

---

# 7. Suggested Data Structure

The backend can provide the AI with data similar to:

{
  "student": {
    "name": "Ali, Noah Z.",
    "id": "22-3146-264"
  },

  "performance": {
    "final_grade": 90.17,
    "subject_rate": 91.7,
    "attendance_rate": 66.7,
    "overall_performance": 82.9
  },

  "categories": [
    {
      "name": "Attendance",
      "weight": 10,
      "equivalent": 83.33,
      "performance": 66.7,
      "records": {
        "present": 4,
        "total": 6
      }
    },

    {
      "name": "Quiz",
      "weight": 10,
      "equivalent": 95.83,
      "performance": 91.7,
      "records": [
        {
          "name": "Q1",
          "score": 25,
          "max": 30,
          "percentage": 83
        },
        {
          "name": "Q2",
          "score": 30,
          "max": 30,
          "percentage": 100
        }
      ],
      "trend": "improving"
    },

    {
      "name": "PT",
      "weight": 30,
      "equivalent": 95,
      "performance": 90,
      "records": [
        {
          "name": "PT1",
          "score": 45,
          "max": 50,
          "percentage": 90
        }
      ]
    },

    {
      "name": "Exam",
      "weight": 50,
      "equivalent": 87.5,
      "performance": 75,
      "records": [
        {
          "name": "Exam",
          "score": 75,
          "max": 100,
          "percentage": 75
        }
      ]
    }
  ]
}

The exact field names should be adapted to the existing application's database/API conventions.

Do not duplicate existing grading calculations unnecessarily.

---

# 8. AI Responsibilities

The AI should analyze:

## Overall performance

Explain the student's general academic situation using the provided data.

## Strengths

Identify areas where the student is performing well.

Examples:

- Strong quiz performance
- Strong performance-task performance
- Improving assessment trend
- Consistent high scores

## Areas to Monitor

Identify meaningful areas that deserve teacher attention.

Examples:

- Low attendance
- Declining assessment scores
- Significant difference between assessment types
- Weak performance in a heavily weighted category

## Patterns

Look for meaningful relationships in the supplied data.

Example:

The student may perform strongly on quizzes and performance tasks but lower on the major examination.

The AI should describe this as an observation, not as a diagnosis.

## Suggested Actions

Provide practical actions a teacher can take.

Examples:

- Monitor attendance
- Discuss attendance barriers with the student
- Provide targeted review activities
- Recommend additional practice
- Monitor the next assessment
- Continue strategies associated with strong performance

## Follow-up

Suggest what the teacher could monitor next.

Example:

"Review the student's next major assessment to determine whether exam performance improves after targeted review."

---

# 9. AI Must Not Invent Information

The AI must only make claims supported by the provided data.

Do NOT allow the AI to invent:

- Student behavior that was not recorded
- Family circumstances
- Medical information
- Psychological conditions
- Motivation
- Personal problems
- Reasons for absences
- Reasons for low scores
- Teacher observations that were not supplied

For example:

BAD:

"The student is probably struggling at home."

GOOD:

"The student's attendance is 66.7%, which may warrant follow-up with the student to understand any barriers to attendance."

The second statement identifies an observable fact and recommends a teacher action without inventing a cause.

---

# 10. AI Must Distinguish Facts From Interpretation

The AI should use careful language.

Facts:

"The student attended 4 of 6 recorded sessions."

Interpretation:

"Attendance is an area that may warrant attention."

Recommendation:

"Consider checking in with the student about attendance."

Do not turn interpretations into facts.

---

# 11. Recommended AI Response Format

The AI should return structured JSON rather than uncontrolled plain text.

Suggested response:

{
  "summary": "The student demonstrates strong overall academic performance, with particularly strong results in quizzes and performance tasks. Attendance is comparatively low, and exam performance is lower than performance in quizzes and PT.",

  "strengths": [
    "Strong quiz performance",
    "Strong performance-task results",
    "Improving quiz trend",
    "High overall academic performance"
  ],

  "areas_of_attention": [
    {
      "area": "Attendance",
      "observation": "The student attended 4 of 6 recorded sessions, resulting in a 66.7% attendance rate.",
      "priority": "high"
    },
    {
      "area": "Exam performance",
      "observation": "The exam performance is 75%, which is lower than the student's quiz and PT performance.",
      "priority": "medium"
    }
  ],

  "suggested_actions": [
    "Monitor attendance and check in with the student regarding barriers to regular participation.",
    "Provide targeted review activities related to the competencies assessed in the exam.",
    "Continue reinforcing strategies associated with the student's strong quiz and performance-task results."
  ],

  "follow_up": [
    "Monitor attendance over the next several sessions.",
    "Review the student's next major assessment to determine whether exam performance improves."
  ],

  "overall_priority": "attendance"
}

The exact JSON schema can be adjusted to match the application's frontend.

---

# 12. Suggested Teacher UI

Inside:

    teacher/analytics

Add a button:

    Summarize Student Behaviour with AI

Potential UI:

--------------------------------------------------
Student Performance
--------------------------------------------------

Ali, Noah Z.

Final Grade       90.17
Performance       82.9%
Attendance        66.7%

[ Summarize Student Behaviour with AI ]

--------------------------------------------------

After generation:

AI Student Summary

Overall
--------------------------------------------------
The student demonstrates strong overall academic
performance...

Strengths
--------------------------------------------------
✓ Strong quiz performance
✓ Strong performance-task results
✓ Improving quiz trend

Areas to Monitor
--------------------------------------------------
⚠ Attendance — 66.7%
⚠ Exam performance — 75%

Suggested Actions
--------------------------------------------------
1. Monitor attendance...
2. Provide targeted review...
3. Continue reinforcing...

Follow-up
--------------------------------------------------
• Monitor attendance over the next several sessions.
• Review the next major assessment.

AI-generated analysis based on the student's
available academic records.
--------------------------------------------------

---

# 13. Loading State

When the teacher clicks the button:

    Summarize Student Behaviour with AI

Show a loading state.

Example:

    Analyzing student performance...

Do not make the teacher think the application is frozen.

The request should have appropriate timeout and error handling.

---

# 14. Error Handling

If the AI service fails:

Show:

    "Unable to generate the AI summary right now.
     Please try again."

Do not break the existing analytics page.

The student's normal grades and analytics must continue working even if the AI service is unavailable.

Possible errors:

- AI API unavailable
- API timeout
- Invalid response
- Invalid JSON
- Rate limit
- Network failure
- Missing student data

The AI feature should fail gracefully.

---

# 15. AI Provider

Final provider: OmniRoute as the AI gateway.

    SmartGrade Backend
       ↓ (OpenAI-compatible API, http://localhost:20128/v1)
    OmniRoute
       ↓
    Configured Combo
       ↓
    Antigravity provider
       ↓
    Claude Sonnet 4.6

The application abstracts the AI provider behind a service:

    AIService
       |
       +-- OmniRouteProvider
       |
       +-- FutureProvider

This means we can replace OmniRoute / the underlying model later without
rewriting the teacher analytics feature.

For example:

    generateStudentAnalysis(data)

The teacher analytics code (`BehavioralAnalytics.jsx`) must not be tightly
coupled to OmniRoute-, Combo-, Antigravity-, or Claude-specific implementation
details. It only calls `POST /api/ai/summarize-student`.

The Combo name / model is configurable through environment variables rather
than hard-coded throughout the application. Example:

    OMNIROUTE_BASE_URL=http://localhost:20128/v1
    OMNIROUTE_API_KEY=
    AI_MODEL=smartgrade pro 3.1
    AI_COMBO_NAME=smartgrade pro 3.1
    AI_TIMEOUT_MS=30000
    AI_TEMPERATURE=0.2
    AI_MAX_TOKENS=1500

---

# 16. API Key Security

OmniRoute credentials / Combo configuration must NEVER be exposed to the frontend.

BAD:

    React/Browser → OmniRoute API directly

GOOD:

    Browser
       ↓
    Application Backend (holds OMNIROUTE_API_KEY / Combo config server-side)
       ↓
    OmniRoute (http://localhost:20128/v1)
       ↓
    Configured Combo → Antigravity → Claude Sonnet 4.6

Rules:
- The backend communicates with OmniRoute, never the frontend.
- Credentials / Combo name / model remain server-side in environment/configuration variables.
- Do not hardcode keys, Combo names, or model strings in source code or in
  JavaScript sent to the browser.

Example:

    OMNIROUTE_BASE_URL=http://localhost:20128/v1
    OMNIROUTE_API_KEY=...
    AI_COMBO_NAME=...

---

# 17. Privacy

Student information is sensitive.

Only send the minimum data required for the AI analysis.

Do not send unrelated student information.

Avoid sending:

- Passwords
- Authentication data
- Internal database IDs unless needed
- Unrelated personal information
- Sensitive information not necessary for the analysis

The AI should receive academic/performance information necessary for the requested analysis.

---

# 18. Do Not Let AI Modify Grades

The AI is read-only with respect to academic results.

The AI must NEVER:

- Change a grade
- Change attendance
- Change assessment scores
- Modify grading weights
- Update student records
- Write directly to the grading database

The AI only produces an analysis.

If future functionality allows teachers to save an AI report, the saved report should be clearly identified as AI-generated.

---

# 19. Important Calculation Rule

The existing grading system is responsible for:

- Raw scores
- Percentages
- Category performance
- Category weights
- Equivalent grades
- Final grades
- Attendance calculations
- Trends that are already calculated by the system

The AI should consume these values.

Do not recreate the grading algorithm inside the AI prompt.

Example:

If the system provides:

    final_grade = 90.17

The AI should use 90.17.

It should not attempt to reconstruct:

    90.17 = ...

from individual scores.

---

# 20. Prompt Design

The AI system prompt should communicate:

You are an academic performance analysis assistant for teachers.

Your job is to analyze structured student performance data supplied by the application.

The application is the source of truth for all numerical values.

Do not recalculate, modify, or invent grades.

Do not invent student circumstances, behavior, motivations, or causes for performance.

Base all observations on the supplied data.

Clearly distinguish observed facts from interpretations.

Provide practical and supportive suggestions that a teacher can consider.

Do not diagnose medical, psychological, or behavioral conditions.

Return the requested response in valid JSON matching the provided schema.

---

# 21. Example AI Prompt

SYSTEM:

You are an academic performance analysis assistant for teachers.

Analyze only the student data provided to you.

The application is the source of truth for all grades, scores, percentages, attendance values, weights, and trends.

Do not modify or recalculate grades.

Do not invent facts.

Do not assume reasons for absences or performance.

Identify strengths, areas that may need attention, observable patterns, and practical teacher actions.

Use neutral, supportive, evidence-based language.

Do not diagnose the student.

Return valid JSON using the requested schema.

USER:

Analyze the following student's academic performance:

{STUDENT_DATA}

Return:

{
  "summary": "...",
  "strengths": [],
  "areas_of_attention": [],
  "suggested_actions": [],
  "follow_up": [],
  "overall_priority": "..."
}

---

# 22. Example Analysis For The Screenshot Student

Given:

Final Grade: 90.17
Overall Performance: 82.9%
Attendance: 66.7%
Quiz: 91.7%
PT: 90%
Exam: 75%
Quiz Trend: Improving

A reasonable AI output could be:

Summary:

"The student demonstrates strong overall academic performance, with particularly strong results in quizzes and performance tasks. The quiz trend is improving. Attendance is comparatively low, while exam performance is lower than performance in quizzes and PT."

Strengths:

- Strong quiz performance
- Strong performance-task performance
- Improving quiz trend
- Strong overall academic result

Areas of attention:

- Attendance is 66.7%
- Exam performance is 75%

Suggested actions:

- Monitor attendance and check in with the student about regular participation.
- Provide targeted review for competencies assessed in the exam.
- Continue reinforcing learning strategies associated with strong quiz and PT performance.

Follow-up:

- Monitor attendance during upcoming sessions.
- Review the next major assessment for changes in performance.

Important:

The AI should NOT state why the student has low attendance unless that information is explicitly provided by the application.

---

# 23. Future Extensions

The architecture should allow future functionality such as:

## Student history

Compare current performance with previous grading periods.

Example:

    Current grade: 90.17
    Previous grade: 86.40

The AI can describe the change.

## Subject-level analysis

Analyze performance across multiple subjects.

## Assessment trend analysis

Identify:

- Improving performance
- Declining performance
- Stable performance
- Large variation between assessments

## Attendance trend

Analyze attendance over time.

## Teacher observations

If the application later contains teacher-provided observations, these can be optionally included as an additional input.

## AI report history

Deferred for MVP — do NOT implement AI report persistence yet.

Future optional shape if persistence is added later:

    student_id
    teacher_id
    generated_at
    report
    model
    prompt_version

This allows teachers to review previous AI analyses.

---

# 24. Implementation Priorities

Implement in this order:

### Phase 1

Reuse the existing frontend `studentAnalytics` object as the AI input payload.
Do NOT duplicate `gradeCalculations.js` logic server-side for MVP.

### Phase 2

Build an AI service abstraction:

    AIService.generateStudentAnalysis(data)

### Phase 3

Implement the OmniRoute provider (`OmniRouteProvider`) using the local
OpenAI-compatible API at `http://localhost:20128/v1`. Model / Combo name comes
from environment variables (`AI_MODEL`, `AI_COMBO_NAME`).

### Phase 4

Implement strict JSON response validation in the backend before returning the
report to the frontend.

### Phase 5

Add the button to:

    teacher/analytics (`BehavioralAnalytics.jsx` student detail modal)

No Claude-specific logic in the frontend — it only calls
`POST /api/ai/summarize-student`.

### Phase 6

Add loading, success, and error states. The page must keep working if
OmniRoute or the AI provider is unavailable.

### Phase 7

Display the AI report in a teacher-friendly UI.

### Phase 8

Test with multiple student performance profiles + OmniRoute-down case.
No persistence for MVP.

---

# 25. Testing Requirements

Test students with different profiles.

Example A — High performer:

    High grades
    High attendance
    Improving trend

Expected:
    Mostly positive summary
    No unnecessary concerns

Example B — Low attendance:

    High grades
    Low attendance

Expected:
    Identify attendance as an area to monitor
    Do not claim why attendance is low

Example C — Declining performance:

    High previous scores
    Lower recent scores

Expected:
    Identify the decline if the supplied data supports it
    Suggest targeted follow-up

Example D — Strong quizzes, weak exams:

    Quiz: 95%
    PT: 90%
    Exam: 65%

Expected:
    Identify the difference
    Suggest reviewing exam-related competencies
    Do not diagnose the reason

Example E — Missing data:

    Some categories have no records

Expected:
    AI should acknowledge insufficient data
    AI should not invent missing scores

---

# 26. Key Design Goal

The feature should feel like:

    "An AI assistant helping the teacher interpret
     the student's existing analytics."

It should NOT feel like:

    "An AI deciding the student's grade."

The teacher remains responsible for interpreting the student's situation and deciding what action to take.

The AI provides evidence-based summaries and suggestions from the data available to the system.

---

# 27. Final Architecture

Recommended architecture (development/demo):

    teacher/analytics
          |
          | Click AI Summary (sends existing studentAnalytics object)
          v
    Teacher Analytics Frontend (BehavioralAnalytics.jsx — no provider logic)
          |
          v
    Backend Controller/API (POST /api/ai/summarize-student)
          |
          v
    Sanitize + Structured Student Data (reuse frontend calculations)
          |
          v
    AIService
          |
          v
    OmniRouteProvider (OpenAI-compatible, http://localhost:20128/v1)
          |
          v
    OmniRoute → Configured Combo → Antigravity → Claude Sonnet 4.6
          |
          v
    JSON Validation (backend)
          |
          v
    AI Analysis Response
          |
          v
    Teacher Analytics UI

The architecture keeps these responsibilities separate:

    Grading System
        = calculates grades (existing gradeCalculations.js, source of truth)

    Student Analytics
        = presents performance data + builds MVP AI input (studentAnalytics)

    AI Service
        = interprets the data via OmniRoute (configurable Combo/model)

    Teacher
        = makes the final decision and takes action

No AI report persistence for MVP. Graceful degradation required: analytics,
grades, export, and pagination must work when OmniRoute is unavailable.
