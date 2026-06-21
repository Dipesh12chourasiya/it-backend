# Reports Module

Rule-based risk report generation and PDF export for recruiters.

---

## Overview

The Reports module generates deterministic, human-readable risk reports from existing monitoring and trust score data. It also provides PDF export functionality for offline sharing.

---

## Report Generation

### Data Sources

All data is read from existing collections — no new collections are created:

| Source | Collection | Used For |
|---|---|---|
| Monitoring Events | MonitoringEvents | Event counts, behavior analysis |
| Session | Sessions | Trust score, duration |
| Interview | Interviews | Title, date, description |
| Candidate | Users | Name, email |

### Report Sections

**1. Interview Summary**
```
Candidate participated in a {duration} minute interview session.
Monitoring remained active throughout the interview.
A total of {totalEvents} monitoring event(s) were recorded.
```

**2. Risk Summary**
```
Final Trust Score: {score}
Risk Level: {level}
{context sentence based on risk level}
```

**3. Behavior Analysis**
```
- {N} tab switch(es) detected.
- {N} paste event(s) detected.
- {N} face-away event(s) detected.
- No no-face violations detected.
```

**4. Final Recommendation**
```
{RECOMMENDED | REVIEW REQUIRED | HIGH RISK CANDIDATE} —
{explanation based on trust score}
```

### Recommendation Rules

| Trust Score | Recommendation | Explanation |
|---|---|---|
| ≥ 80 | RECOMMENDED | Minimal suspicious activity |
| 50-79 | REVIEW REQUIRED | Some suspicious activity |
| < 50 | HIGH RISK CANDIDATE | Multiple suspicious events |

---

## PDF Generation

### Service

`pdf.service.ts` uses `pdfkit` to generate PDF documents.

### PDF Content

1. **Header**: "Interview Risk Report" + generation timestamp
2. **Candidate Information**: Name, email
3. **Interview Information**: Title, code, date, duration
4. **Trust Assessment**: Score + risk level
5. **Monitoring Statistics**: All 7 event types + total
6. **Interview Summary**: Duration + event count narrative
7. **Behavior Analysis**: Bulleted event list
8. **Final Recommendation**: Color-coded label + explanation
9. **Footer**: Confidential notice + timestamp

### Download Flow

```
Frontend Button Click
    ↓
ReportService.downloadPdfReport()
    ↓
HttpClient GET /api/v1/reports/interview/:id/pdf?candidateId=:cid
    ↓
Backend: getInterviewReportPdf()
    ↓
pdf.service.ts: generatePdfReport()
    ↓
Returns PDF buffer with headers:
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="interview-report-{id}.pdf"
    ↓
Frontend receives Blob
    ↓
Create object URL → <a> click → Browser download
```

---

## API Endpoints

### GET /reports/interview/:interviewId

Generate a rule-based risk report.

**Query Parameters**: `candidateId` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "interviewSummary": "...",
    "riskSummary": "...",
    "behaviorAnalysis": "...",
    "finalRecommendation": "...",
    "trustScore": 84,
    "riskLevel": "LOW",
    "statistics": {
      "tabSwitches": 2,
      "copyEvents": 0,
      "pasteEvents": 1,
      "fullscreenExits": 0,
      "noFaceEvents": 0,
      "multipleFaceEvents": 0,
      "faceAwayEvents": 0,
      "interviewDurationMinutes": 47
    }
  }
}
```

### GET /reports/interview/:interviewId/pdf

Download PDF report.

**Query Parameters**: `candidateId` (required)

**Response**: Binary PDF file

---

## Route Order

PDF route is registered before the generic route to avoid parameter collision:

```typescript
router.get("/interview/:interviewId/pdf", protect, getInterviewReportPdf);
router.get("/interview/:interviewId", protect, getInterviewReport);
```

Without this order, Express would match `/interview/:id/pdf` as `/interview/:id` with `pdf` as the interviewId.
