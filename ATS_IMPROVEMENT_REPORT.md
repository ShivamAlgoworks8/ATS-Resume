# ATS Resume Maker — Improvement Report

## 1. Original Implementation

### Backend (`backend/` — Spring Boot 3.3.5, Java 21, Apache Tika 2.9.2, MongoDB)
- **Existing Structure:**
  - `Main.java` and `AtsResumeMakerApplication.java`
  - `controller/ResumeController.java`
  - `service/ResumeService.java`
  - `repository/ResumeRepository.java`
  - `model/Resume.java` and `model/ProcessingStatus.java`
  - `dto/ResumeUpdateRequest.java`
  - `exception/GlobalExceptionHandler.java`, `FileStorageException.java`, `InvalidFileException.java`, `ResourceNotFoundException.java`
- **Original Capabilities:**
  - Accepted PDF and DOCX uploads (`POST /api/v1/resumes/upload`), validated MIME types via Apache Tika, stored files in `backend/uploads/`, extracted raw plain text (`extractedText`), and saved metadata to MongoDB (`ats_resume_maker.resumes`).
  - Did not implement structured resume parsing, experience calculation, Groq AI integration, JD analysis (`POST /api/v1/resumes/{id}/analyze`), structured editing persistence (`PUT /api/v1/resumes/{id}/structured`), or resume optimization (`POST /api/v1/resumes/{id}/optimize`).

### Frontend (`frontend/` — Angular Standalone Components + Signals)
- Multi-step workflow across `Dashboard`, `Resume Analyzer`, `Analysis Results` / `Detailed Report`, `Resume Generator` (LaTeX/Template Studio), `My Analyses`, `My Resumes`, and `Templates`.
- Previously relied on client-side fallback heuristics in `workflow-state.service.ts` (`deriveStructuredFromRecord` and `buildPreviewAtsAnalysis`) because the backend only returned raw `extractedText`.

---

## 2. Issues Found

1. **Incomplete Resume Parsing & Missing Sections:**
   - The frontend fallback sliced only the first 4 matching lines into a single placeholder experience item (`"Extracted from Uploaded Resume"`) and the next 3 lines into a single placeholder project (`"Extracted Project Experience"`), hardcoding education to `"Degree (Parsed from Resume)"`.
   - Multi-role work histories, multiple projects (including enterprise and numbered projects), project tech stacks, education details/grades, and achievements were dropped.
   - Multi-column and letter-spaced PDFs (e.g., `R A J E S H  K U M A R`, `9 t h  N o v  2 0 2 0  –  P r e s e n t`) and trailing Apache Tika `\t`-prefixed PDF bookmark dumps caused broken text segmentation.

2. **Incorrect Total Experience Calculation:**
   - Experience was estimated from bullet count and word count (`50 + expCount * 8 + (wordCount > 180 ? 15 : 5)`) instead of parsing actual employment start/end dates (`Jan 2022 - Present`, `Jun 2021 - Jan 2022`, `9th Nov 2020 - Present`) and merging overlapping intervals.

3. **Lack of Semantic JD Matching & Genuine ATS Scoring:**
   - Keyword matching checked naive substring inclusion without understanding synonyms or abbreviations (`JS` = `JavaScript`, `React.js` = `React`, `Postgres` = `PostgreSQL`, `K8s` = `Kubernetes`, `RESTful APIs` = `REST APIs`).

4. **Destructive Suggestion Application:**
   - Approving suggestions in the frontend blindly prepended `suggestedText` (including general advice strings) as new bullets on `experience[0]` instead of updating the target bullet or summary in-place.

5. **Binary Job Description File Upload Bug:**
   - Uploading a `.pdf` or `.docx` Job Description file in `StepUploadComponent` used `FileReader.readAsText(file)`, dumping raw binary bytes into the JD textarea instead of extracting text with Apache Tika.

---

## 3. Changes Made

1. **Clean, Self-Contained Backend Implementation (No Extra Packages or Helper Classes):**
   - Kept the original package structure intact (`controller`, `service`, `repository`, `model`, `dto`, `exception`) and implemented all Groq AI parsing, date-range experience calculation, semantic JD matching, ATS scoring, and resume optimization directly inside [ResumeService.java](file:///Users/shivamsrivastav/ATS%20Resume/backend/src/main/java/com/atsresume/service/ResumeService.java).

2. **Secure Groq API Configuration via `backend/.env`:**
   - Stored `GROQ_API_KEY` and `GROQ_MODEL` in `backend/.env` (added to `.gitignore` so secrets are never committed or exposed to the Angular frontend).
   - Configured [application.properties](file:///Users/shivamsrivastav/ATS%20Resume/backend/src/main/resources/application.properties) with `spring.config.import=optional:file:.env[.properties],optional:file:backend/.env[.properties]`.
   - Added automatic model failover in `ResumeService.callGroqJson(...)` across Groq models (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`) when per-minute token rate limits (`HTTP 429`) occur.

3. **Groq Structured Resume Parsing & Grounding (`ResumeService.parseStructured`):**
   - Cleans raw Apache Tika text (`cleanResumeText`) to normalize letter-spaced PDF headers/dates and strip duplicate trailing `\t` PDF bookmark trees.
   - Uses Groq with `response_format: {"type": "json_object"}` and `max_tokens: 4096` to extract all `contact`, `professionalSummary`, `skillCategories`, `experience`, `projects`, `education`, and `achievements`.
   - Verifies extracted companies, roles, project titles, and skills against the original resume text (`appearsInText`) so hallucinated items are never accepted.
   - Calculates `totalExperienceMonths` (`calculateExperienceMonths`) by parsing employment `startDate` and `endDate` into `YearMonth` ranges and merging overlapping periods.

4. **Semantic JD Matching, Genuine ATS Scoring & Grounded Optimization (`ResumeService.analyze`, `ResumeService.optimize`):**
   - Compares the candidate's parsed resume and calculated experience against the target Job Description using Groq.
   - Matches exact skills, synonyms, and abbreviations (`React.js` ↔ `React`, `Postgres` ↔ `PostgreSQL`, `K8s` ↔ `Kubernetes`, `SQL` ↔ `PostgreSQL`, `RESTful APIs` ↔ `API`) while keeping distinct roles separate.
   - Returns genuine scores (`overallScore`, `skillsMatchPercentage`, `experienceRelevance`, `educationRelevance`, `formattingScore`), `scoreBreakdown` explanations, `semanticMatches`, and grounded suggestions (`REPLACE_BULLET`, `REPLACE_SUMMARY`, `ADD_SKILL`, `ADVICE`).
   - Checks suggested rewrites with `hasInventedNumbers` so ungrounded metrics/percentages are never injected into candidate bullets.

5. **Frontend-Backend Integration:**
   - Connected [workflow-state.service.ts](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/services/workflow-state.service.ts), [resume.service.ts](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/services/resume.service.ts), and [step-upload.component.ts](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/pages/workflow/step-upload/step-upload.component.ts) to the Spring Boot endpoints (`/extract-text`, `/reparse`, `/analyze`, `/optimize`, `/structured`).
   - Added Semantic & Alias Match badges and Detected Experience (`yrs / mos`) on [step-analysis.component.html](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/pages/workflow/step-analysis/step-analysis.component.html) and Current vs. Proposed comparison views on [step-suggestions.component.html](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/pages/workflow/step-suggestions/step-suggestions.component.html).

---

## 4. Files Modified

### Backend
- **Created in `com.atsresume.service`:**
  - [backend/src/main/java/com/atsresume/service/ResumeParsingService.java](file:///Users/shivamsrivastav/ATS%20Resume/backend/src/main/java/com/atsresume/service/ResumeParsingService.java) *(Apache Tika text extraction, Groq structured resume parsing, grounding, and date-range experience calculation)*
  - [backend/src/main/java/com/atsresume/service/ResumeAnalysisService.java](file:///Users/shivamsrivastav/ATS%20Resume/backend/src/main/java/com/atsresume/service/ResumeAnalysisService.java) *(JD matching, semantic/synonym matching, and genuine ATS scoring)*
  - [backend/src/main/java/com/atsresume/service/ResumeOptimizationService.java](file:///Users/shivamsrivastav/ATS%20Resume/backend/src/main/java/com/atsresume/service/ResumeOptimizationService.java) *(AI suggestions validation and resume optimization)*
- **Modified:**
  - [backend/.env](file:///Users/shivamsrivastav/ATS%20Resume/backend/.env) *(local only, git-ignored)*
  - [backend/src/main/resources/application.properties](file:///Users/shivamsrivastav/ATS%20Resume/backend/src/main/resources/application.properties)
  - [backend/src/main/java/com/atsresume/model/Resume.java](file:///Users/shivamsrivastav/ATS%20Resume/backend/src/main/java/com/atsresume/model/Resume.java)
  - [backend/src/main/java/com/atsresume/controller/ResumeController.java](file:///Users/shivamsrivastav/ATS%20Resume/backend/src/main/java/com/atsresume/controller/ResumeController.java)
  - [backend/src/main/java/com/atsresume/service/ResumeService.java](file:///Users/shivamsrivastav/ATS%20Resume/backend/src/main/java/com/atsresume/service/ResumeService.java)
  - [backend/src/main/java/com/atsresume/exception/GlobalExceptionHandler.java](file:///Users/shivamsrivastav/ATS%20Resume/backend/src/main/java/com/atsresume/exception/GlobalExceptionHandler.java)

### Frontend
- [frontend/src/app/models/resume.models.ts](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/models/resume.models.ts)
- [frontend/src/app/mocks/resume-mock.data.ts](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/mocks/resume-mock.data.ts)
- [frontend/src/app/services/resume.service.ts](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/services/resume.service.ts)
- [frontend/src/app/services/workflow-state.service.ts](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/services/workflow-state.service.ts)
- [frontend/src/app/pages/workflow/step-upload/step-upload.component.ts](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/pages/workflow/step-upload/step-upload.component.ts)
- [frontend/src/app/pages/workflow/step-analysis/step-analysis.component.html](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/pages/workflow/step-analysis/step-analysis.component.html)
- [frontend/src/app/pages/workflow/step-suggestions/step-suggestions.component.html](file:///Users/shivamsrivastav/ATS%20Resume/frontend/src/app/pages/workflow/step-suggestions/step-suggestions.component.html)

---

## 5. Testing Results

### Build Verification
- **Backend (`mvn -f backend/pom.xml compile`):** `BUILD SUCCESS` (12 source files compiled, 0 errors).
- **Frontend (`./node_modules/.bin/ngc -p tsconfig.app.json --noEmit`):** `0` errors.

### Live Groq Parsing Verification Across All 5 Stored PDF Resumes
| Resume File | Parsing Method | Calculated Experience | Experience Entries | Projects Extracted | Education Entries | Skill Categories |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| `ARUSHI_GAUTAM_CV.pdf` | `GROQ` | **98 mos (8.2 yrs)** | 3 | 2 | 1 | 3 |
| `Pooja_Aggarwal_-_Senior_Software_Engineer__2__2.pdf` | `GROQ` | **73 mos (6.1 yrs)** | 5 | 0 | 1 | 7 |
| `Anupriya_Kumari_QA_Resume.pdf` | `GROQ` | **86 mos (7.2 yrs)** | 3 | 0 | 1 | 10 |
| `Rajesh_Kumar_Senior_QA_Engineer_Resume__1_.pdf` | `GROQ` | **73 mos (6.1 yrs)** | 1 | 4 | 3 | 10 |
| `Arjun_Mehta_Senior_Software_Architect_Resume.pdf` | `GROQ` | **185 mos (15.4 yrs)** | 4 | 14 | 1 | 7 |

### Live Groq Semantic JD Matching, Scoring & Optimization Verification
1. **QA Automation JD vs. `ARUSHI_GAUTAM_CV.pdf` (`POST /api/v1/resumes/{id}/analyze` & `/optimize`):**
   - **Scores:** `overallScore: 76`, `skillsMatchPercentage: 70`, `experienceRelevance: 80`, `educationRelevance: 90`, `formattingScore: 85`.
   - **Semantic Matches:** `SQL ← PostgreSQL`, `JIRA ← Jira`, `RESTful APIs ← API`.
   - **Matched Skills:** `Playwright`, `RESTful APIs`, `Postman`, `Jira`, `SQL (PostgreSQL)`, `Agile/Scrum`, `Mobile testing`, `Web automation testing`.
   - **Missing Skills:** `Selenium`, `JavaScript`, `CI/CD Jenkins`, `Cypress`.
   - **Optimization (`/optimize`):** Applied grounded `REPLACE_BULLET` suggestion cleanly while preserving all 3 experience entries and 2 projects.
2. **Principal Cloud Architect JD vs. `Arjun_Mehta_Senior_Software_Architect_Resume.pdf`:**
   - **Scores:** `overallScore: 94`, `skillsMatchPercentage: 100`, `experienceRelevance: 90`, `educationRelevance: 90`, `formattingScore: 85`.
   - **Semantic Matches:** `React.js ← React`, `OAuth2/OIDC ← OAuth2`, `CI/CD ← GitHub Actions / Jenkins`, `K8s ← Kubernetes`, `Postgres ← PostgreSQL`.

---

## 6. Pending Issues / Notes
- **Groq Free-Tier Rate Limits:** On Groq's `on_demand` free tier, each model has an 8,000 tokens-per-minute (TPM) limit. `ResumeService.callGroqJson` automatically falls back across `openai/gpt-oss-120b` → `openai/gpt-oss-20b` → `qwen/qwen3.8-27b` if a `429` rate limit occurs during rapid consecutive requests.
