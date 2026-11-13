package com.atsresume.service;

import com.atsresume.exception.FileStorageException;
import com.atsresume.model.Resume;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ResumeAnalysisService {

    private static final Set<String> NON_TECH_AND_SOFT_SKILLS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            // Generic filler / non-skill words
            "technical", "technology", "technologies", "skill", "skills",
            "tool", "tools", "experience", "knowledge", "proficient", "proficiency",
            "competency", "competencies", "competence", "understanding",
            "ability", "abilities", "analysis", "analytical", "development",
            "developer", "engineer", "engineering", "work", "working",
            "responsibility", "responsibilities", "requirement", "requirements",
            "qualification", "qualifications", "candidate", "role", "roles",
            "support", "operations", "operation", "solutions", "solution",
            "systems", "system", "design", "management", "methodology", "methodologies",
            "best practices", "best practice", "process", "processes", "procedure", "procedures",
            "standard", "standards", "practice", "practices", "framework", "frameworks",
            "language", "languages", "software", "hardware", "application", "applications",
            "platform", "platforms", "overview", "basics", "fundamentals", "documentation",

            // Soft skills / behavioral attributes / personality traits
            "adaptability", "adaptable",
            "attention to detail", "detail oriented", "detail-oriented", "detail orientation",
            "communication", "communications", "communication skills", "verbal communication",
            "written communication", "oral communication", "interpersonal communication",
            "teamwork", "team player", "team-player", "team work", "team building", "team collaboration",
            "collaboration", "collaborative", "collaborator", "collaborating",
            "cross-functional collaboration", "cross functional collaboration", "cross-functional teams",
            "problem solving", "problem-solving", "problem solver", "troubleshooting skills",
            "critical thinking", "critical thinker",
            "creative thinking", "creativity", "creative",
            "leadership", "leader", "leading",
            "time management", "prioritization", "prioritizing", "multitasking", "multi-tasking",
            "interpersonal", "interpersonal skills",
            "work ethic", "strong work ethic",
            "self-motivated", "self motivated", "self-starter", "self starter", "proactive", "initiative",
            "fast learner", "quick learner", "eager to learn", "willingness to learn", "continuous learner",
            "flexibility", "flexible",
            "organization", "organizational", "organizational skills", "organized",
            "emotional intelligence", "empathy",
            "presentation", "presentation skills", "public speaking",
            "decision making", "decision-making",
            "conflict resolution", "negotiation", "negotiating",
            "active listening", "listening",
            "relationship building", "networking",
            "strategic thinking", "strategic planning",
            "work independently", "independent work", "independent worker", "working independently",
            "ownership", "accountability",
            "enthusiasm", "enthusiastic", "passion", "passionate",
            "curiosity", "intellectual curiosity",
            "stress management", "work under pressure", "working under pressure",
            "punctuality", "punctual", "dependability", "dependable", "reliable", "reliability",
            "customer service", "client relations", "stakeholder management",
            "mentoring", "mentorship", "coaching",
            "resourcefulness", "resourceful",
            "positive attitude", "can-do attitude", "professionalism")));

    public static boolean isNonTechnicalOrSoftSkill(String term) {
        if (term == null) {
            return false;
        }
        String clean = term.replaceAll("^[+\\-*•\\s]+", "")
                .replaceAll("[+\\-*•\\s]+$", "")
                .trim()
                .toLowerCase(Locale.ROOT);
        if (clean.isEmpty()) {
            return true;
        }

        if (NON_TECH_AND_SOFT_SKILLS.contains(clean)) {
            return true;
        }

        String spaceNorm = clean.replace('-', ' ').replaceAll("\\s+", " ").trim();
        if (NON_TECH_AND_SOFT_SKILLS.contains(spaceNorm)) {
            return true;
        }

        if (spaceNorm.matches(
                "^(?:soft|interpersonal|behavioral|communication|analytical|organizational|leadership)\\s+skills?$")
                || spaceNorm.matches(
                        "^(?:technical|general|basic|core|key|target|required)\\s+(?:skills?|knowledge|abilities?|tools?|competencies?)$")
                || spaceNorm.matches(
                        "^(?:strong|good|excellent|effective|proven)\\s+(?:communication|teamwork|leadership|adaptability|problem solving|interpersonal skills?)$")
                || spaceNorm.matches("^(?:ability to|able to|willingness to|demonstrated ability)\\b.*$")
                || spaceNorm.matches("^(?:verbal|oral|written)\\s+communication(?:\\s+skills?)?$")
                || spaceNorm.matches("^(?:detail|results?|goal)\\s+oriented(?:ness)?$")) {
            return true;
        }

        return false;
    }

    private final ResumeParsingService parsingService;
    private final ResumeOptimizationService optimizationService;

    public ResumeAnalysisService(
            ResumeParsingService parsingService,
            ResumeOptimizationService optimizationService) {
        this.parsingService = parsingService;
        this.optimizationService = optimizationService;
    }

    public ObjectNode analyzeResume(
            Resume resume,
            JsonNode structured,
            String jobTitle,
            String companyName,
            String jd,
            int totalMonths) {

        double totalYears = Math.round((totalMonths / 12.0) * 10.0) / 10.0;

        if (structured.isObject()
                && (!structured.path("originalProjects").isArray() || structured.path("originalProjects").isEmpty())
                && structured.path("projects").isArray()) {
            ((ObjectNode) structured).set("originalProjects", structured.path("projects").deepCopy());
        }
        JsonNode originalProjects = structured.path("originalProjects").isArray()
                ? structured.path("originalProjects")
                : structured.path("projects");
        boolean hasProjects = originalProjects.isArray() && !originalProjects.isEmpty();

        String systemPrompt = """
                Analyze the resume against the job description based on contextual meaning and return strict JSON.
                - Match equivalent skills, abbreviations, and synonyms by meaning (e.g., JS = JavaScript, React.js = React, Postgres = PostgreSQL, K8s = Kubernetes). In "semanticMatches", list at most 6 non-identical alias/synonym pairs where the JD term and resume term are spelled differently (never include identical pairs like Docker = Docker or repeat items).
                - Do not treat different roles as equivalent.
                - For "matchedKeywords", "missingKeywords", "relevantSkills", and "extraOrLessRelevantTerms":
                  * Include ONLY concrete, hard technical skills, tools, programming languages, software, frameworks, libraries, databases, cloud platforms, hardware systems, protocols, or engineering methodologies explicitly present in the JD.
                  * STRICTLY EXCLUDE all generic filler words (e.g., "technical", "analysis", "technology", "skills", "experience", "knowledge", "responsibilities", "development", "developer", "engineering").
                  * STRICTLY EXCLUDE all soft skills, behavioral traits, and personal attributes (e.g., "adaptability", "attention to detail", "communication", "teamwork", "collaboration", "problem solving", "critical thinking", "creativity", "leadership", "time management", "multitasking", "work ethic", "fast learner", "flexible"). These are NOT technical skills and must NEVER appear in matched/missing/relevant skills.
                - Evaluate both work experience and any projects present in the resume against the job description. Never invent projects if the resume has none.
                - For "sanitizedProjects": if the resume has <= 10 projects, include all of them; if > 10 projects, select only the top 10 most relevant to the JD. For each selected project, convert its title ("genericTitle") and bullets ("sanitizedBullets") into generic, professional descriptions that do NOT reveal exact project names, client names, internal modules, or confidential details, while accurately communicating the candidate's real contributions, functionality, and technical skills without inventing facts.
                - For "optimizedProfessionalSummary": analyze and understand the candidate's entire resume (experience, core technical skills, projects, and domain impact) alongside the target Job Description, and write an impactful, ATS-optimized professional profile summary of approximately 75 to 80 words (strictly maximum 80 words). Use ONLY real facts, skills, and experience from the resume, tailored to the JD, with zero meta-instructions.
                - Provide 0-100 scores for "skillsMatchPercentage", "experienceRelevance", "educationRelevance", and "formattingScore", plus a concise "executiveSummary".
                - Provide 4-6 grounded "suggestions" ("actionType": "REPLACE_BULLET", "REPLACE_SUMMARY", "ADD_SKILL", or "ADVICE") using only facts and numbers already present in the resume. For every suggestion, clearly provide:
                  * "originalText": the EXACT current bullet, summary, or text from the candidate's resume that needs improvement (never leave empty for REPLACE_BULLET or REPLACE_SUMMARY).
                  * "suggestedChange": the improved, ATS-optimized version with strong action verbs and quantified impact.
                  * "currentIssue": a concise observation explaining why the original text is weak, wordy, or missing key details.
                  * "reason": why the improved version better aligns with the target JD and ATS requirements.
                  * "targetEntryIndex" and "targetBulletIndex": exact index of the experience entry and bullet being improved.
                  Never suggest adding generic words or soft skills as "ADD_SKILL". Any "REPLACE_SUMMARY" suggestion must also be a complete ~75-80 word profile summary (strictly maximum 80 words). If the resume contains projects, do NOT include project suggestions here (they are generated separately).
                JSON schema:
                {
                  "skillsMatchPercentage": 0, "experienceRelevance": 0, "educationRelevance": 0, "formattingScore": 0,
                  "executiveSummary": "",
                  "optimizedProfessionalSummary": "",
                  "matchedKeywords": [], "missingKeywords": [], "relevantSkills": [], "extraOrLessRelevantTerms": [],
                  "semanticMatches": [{ "jdTerm": "", "resumeEvidence": "" }],
                  "sanitizedProjects": [{ "originalIndex": 0, "genericTitle": "", "sanitizedBullets": [""] }],
                  "suggestions": [{ "category": "EXPERIENCE_IMPROVEMENTS", "targetSection": "Experience", "title": "", "currentIssue": "", "reason": "", "suggestedChange": "", "originalText": "", "actionType": "REPLACE_BULLET", "targetEntryIndex": 0, "targetBulletIndex": 0, "jobTitle": "", "company": "" }]
                }
                """;

        ObjectNode promptResume = structured.deepCopy();
        promptResume.set("projects", originalProjects.deepCopy());
        // Score the candidate's own summary, not a summary previously rewritten for a
        // JD in an earlier scan
        String originalSummary = structured.path("originalSummary").asText("");
        if (!originalSummary.isBlank()) {
            promptResume.put("professionalSummary", originalSummary);
        }
        promptResume.remove("originalSummary");

        // Text that proves a skill really exists in the resume (excludes the
        // AI-optimized summary)
        String resumeEvidence = (resume.getExtractedText() == null ? "" : resume.getExtractedText())
                + " " + structured.path("skillCategories")
                + " " + structured.path("experience")
                + " " + originalProjects;

        String userPrompt = "Target Job Title: " + jobTitle
                + "\nTarget Company: " + companyName
                + "\nCandidate Experience: " + totalMonths + " months (" + totalYears + " years)"
                + "\n\nJob Description:\n" + jd
                + "\n\nResume JSON:\n" + promptResume.toString();

        // Same resume + JD + prompt => reuse the stored AI result so repeated scans
        // give the same score
        String cacheKey = sha256(systemPrompt + "\n" + userPrompt);
        JsonNode aiResult = null;
        Map<String, Object> cache = resume.getAnalysisAiCache();
        if (cache != null && cacheKey.equals(cache.get("key")) && cache.get("result") instanceof String cached) {
            aiResult = parsingService.readJson(cached);
        }
        if (aiResult == null || !aiResult.isObject()) {
            aiResult = parsingService.callGroqJson(systemPrompt, userPrompt);
            if (aiResult == null || !aiResult.isObject()) {
                throw new FileStorageException("AI analysis failed or Groq API did not return a valid response", null);
            }
            Map<String, Object> fresh = new HashMap<>();
            fresh.put("key", cacheKey);
            fresh.put("result", aiResult.toString());
            resume.setAnalysisAiCache(fresh);
        }

        if (hasProjects && structured.isObject()) {
            ArrayNode selectedAndSanitized = optimizationService.selectAndSanitizeProjects(
                    originalProjects,
                    aiResult.path("sanitizedProjects"),
                    jd,
                    resume.getExtractedText());
            ((ObjectNode) structured).set("projects", selectedAndSanitized);
        }

        if (structured.isObject()) {
            String optimizedSummary = optimizationService.buildOptimizedProfileSummary(
                    aiResult.path("optimizedProfessionalSummary").asText(""),
                    structured,
                    resume.getExtractedText());
            if (!optimizedSummary.isEmpty()) {
                ((ObjectNode) structured).put("professionalSummary", optimizedSummary);
            }
        }

        String analysisId = "ana-" + UUID.randomUUID().toString().substring(0, 8);
        ObjectNode out = parsingService.createObjectNode();
        out.put("id", analysisId);
        out.put("analysisId", analysisId);
        out.put("resumeId", resume.getId());
        out.put("resumeFileName", resume.getFileName());
        out.put("jobTitle", jobTitle.isEmpty() ? "Target Role" : jobTitle);
        out.put("companyName", companyName);
        out.put("jobDescription", jd);
        out.put("analyzedAt", Instant.now().toString());
        out.put("isMockPreview", false);
        out.put("aiPowered", true);
        out.put("parsingMethod", "GROQ");
        out.put("totalExperienceMonths", totalMonths);
        out.put("totalExperienceYears", totalYears);

        ArrayNode matchedKwArr = out.putArray("matchedKeywords");
        copyMergedStrings(aiResult.path("matchedKeywords"), aiResult.path("matchedSkills"), matchedKwArr);

        ArrayNode missingKwArr = out.putArray("missingKeywords");
        copyMergedStrings(aiResult.path("missingKeywords"), aiResult.path("missingSkills"), missingKwArr);

        // Re-check every AI keyword against the real resume text so the AI cannot
        // over/under-claim matches
        reconcileKeywords(matchedKwArr, missingKwArr, aiResult.path("semanticMatches"), resumeEvidence);
        out.set("matchedSkills", matchedKwArr.deepCopy());
        out.set("missingSkills", missingKwArr.deepCopy());

        ArrayNode relevantArr = out.putArray("relevantSkills");
        copyMergedStrings(aiResult.path("relevantSkills"), aiResult.path("matchedKeywords"), relevantArr);

        ArrayNode extraArr = out.putArray("extraOrLessRelevantTerms");
        copyMergedStrings(aiResult.path("extraOrLessRelevantTerms"), aiResult.path("lessRelevantSkills"), extraArr);
        out.set("lessRelevantSkills", extraArr.deepCopy());

        int matchedSkillCount = matchedKwArr.size();
        int missingSkillCount = missingKwArr.size();
        int totalJdSkills = matchedSkillCount + missingSkillCount;

        int aiSkillsScore = clampScore(aiResult.path("skillsMatchPercentage").asInt(0));
        int skillsMatch = totalJdSkills > 0
                ? clampScore((int) Math.round((matchedSkillCount * 100.0) / totalJdSkills))
                : aiSkillsScore;

        // Experience relevance is calculated in Java: 80% JD-keyword coverage inside
        // experience/project text
        // plus 20% years of experience (capped at 5 years). The AI score is only a
        // fallback.
        int aiExpScore = clampScore(aiResult.path("experienceRelevance").asInt(0));
        if (totalJdSkills > 0) {
            String normExperience = normalizeTerm(structured.path("experience") + " " + originalProjects);
            int usedInWork = 0;
            for (ArrayNode list : new ArrayNode[] { matchedKwArr, missingKwArr }) {
                for (JsonNode kw : list) {
                    if (termInEvidence(kw.asText(), normExperience)) {
                        usedInWork++;
                    }
                }
            }
            double coverage = usedInWork * 100.0 / totalJdSkills;
            double duration = Math.min(totalMonths, 60) / 60.0 * 100.0;
            aiExpScore = clampScore((int) Math.round(coverage * 0.8 + duration * 0.2));
        }
        int expRelevance = validateExperienceScore(
                aiExpScore,
                totalMonths,
                structured);
        int eduRelevance = validateEducationScore(
                clampScore(aiResult.path("educationRelevance").asInt(0)),
                structured);
        int fmtScore = calculateFormattingScore(
                clampScore(aiResult.path("formattingScore").asInt(0)),
                structured);

        int overall = clampScore((int) Math.round(
                skillsMatch * 0.45 + expRelevance * 0.25 + eduRelevance * 0.15 + fmtScore * 0.15));

        out.put("skillsMatchPercentage", skillsMatch);
        out.put("experienceRelevance", expRelevance);
        out.put("educationRelevance", eduRelevance);
        out.put("formattingScore", fmtScore);
        out.put("overallScore", overall);

        String execSummary = aiResult.path("executiveSummary").asText("").trim();
        if (execSummary.isEmpty()) {
            execSummary = "Matched " + matchedSkillCount + " of " + totalJdSkills
                    + " target JD skills with " + totalYears + " years of experience (Overall ATS Score: " + overall
                    + "/100).";
        }
        out.put("executiveSummary", execSummary);

        ArrayNode semArr = out.putArray("semanticMatches");
        Set<String> seenSem = new LinkedHashSet<>();
        if (aiResult.path("semanticMatches").isArray()) {
            for (JsonNode sm : aiResult.path("semanticMatches")) {
                if (semArr.size() >= 6) {
                    break;
                }
                String jdTerm = sm.path("jdTerm").asText("").trim();
                String evidence = sm.path("resumeEvidence").asText(sm.path("resumeTerm").asText("")).trim();
                if (isNonTechnicalOrSoftSkill(jdTerm) || isNonTechnicalOrSoftSkill(evidence)) {
                    continue;
                }
                String normJd = jdTerm.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#]", "");
                String normEv = evidence.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#]", "");
                if (!jdTerm.isEmpty()
                        && !evidence.isEmpty()
                        && !normJd.equals(normEv)
                        && seenSem.add(normJd)) {
                    ObjectNode item = semArr.addObject();
                    item.put("jdTerm", jdTerm);
                    item.put("resumeEvidence", evidence);
                    item.put("resumeTerm", evidence);
                }
            }
        }

        ArrayNode secArr = out.putArray("sectionEvaluations");
        addSectionEval(secArr, "Skills & Technical Stack", skillsMatch,
                matchedSkillCount + " matched and " + missingSkillCount
                        + " missing target skills from the job description.");
        addSectionEval(secArr, "Work Experience", expRelevance,
                totalYears + " years (" + totalMonths
                        + " months) total experience evaluated for role alignment and impact.");
        if (hasProjects) {
            int totalExtracted = originalProjects.size();
            int selectedCount = structured.path("projects").size();
            int projScore = clampScore((int) Math.round(expRelevance * 0.6 + skillsMatch * 0.4));
            addSectionEval(secArr, "Projects & JD Relevance", projScore,
                    selectedCount + " of " + totalExtracted
                            + " project(s) selected and sanitized for the target job description.");
        }
        addSectionEval(secArr, "Education & Credentials", eduRelevance,
                structured.path("education").size() + " education entry(s) evaluated against role requirements.");
        addSectionEval(secArr, "ATS Formatting & Structure", fmtScore,
                "Evaluated contact completeness, section headers, and bullet structure.");
        out.set("scoreBreakdown", secArr.deepCopy());
        out.set("structuredResume", structured);

        ArrayNode checksArr = out.putArray("readabilityChecks");
        JsonNode contact = structured.path("contact");
        boolean hasContact = !contact.path("fullName").asText("").isBlank()
                && !contact.path("email").asText("").isBlank();
        addReadabilityCheck(checksArr, "Contact Information", hasContact,
                hasContact ? "Name and email address clearly detected."
                        : "Missing full name or email in contact header.");
        boolean hasSummary = structured.path("professionalSummary").asText("").length() >= 40;
        addReadabilityCheck(checksArr, "Executive Summary", hasSummary,
                hasSummary ? "Professional summary is present and well-sized."
                        : "Add a concise 2-3 sentence professional summary.");
        boolean hasExp = structured.path("experience").size() > 0 || structured.path("projects").size() > 0;
        addReadabilityCheck(checksArr, "Experience & Project Bullets", hasExp,
                hasExp ? "Work experience and project entries parsed into structured bullets."
                        : "No structured experience or project bullets detected.");
        boolean hasSkills = structured.path("skillCategories").size() > 0;
        addReadabilityCheck(checksArr, "Categorized Skills Section", hasSkills,
                hasSkills ? "Skills are organized into clear ATS-friendly categories."
                        : "Group technical skills into clear categories.");

        ArrayNode sugArr = out.putArray("suggestions");
        optimizationService.populateSuggestions(aiResult.path("suggestions"), sugArr, structured,
                resume.getExtractedText());
        if (hasProjects) {
            JsonNode selectedProjects = structured.path("projects");
            String projCacheKey = sha256(selectedProjects.toString() + "\n" + jd);
            JsonNode aiProjectResult = null;
            Map<String, Object> aiCache = resume.getAnalysisAiCache();
            if (aiCache != null
                    && projCacheKey.equals(aiCache.get("projectKey"))
                    && aiCache.get("projectResult") instanceof String cachedProj) {
                aiProjectResult = parsingService.readJson(cachedProj);
            }
            if (aiProjectResult == null || !aiProjectResult.path("projectSuggestions").isArray()) {
                aiProjectResult = optimizationService.fetchProjectSuggestionsFromAi(
                        selectedProjects, structured.path("skillCategories"), jd);
                if (aiProjectResult != null && aiProjectResult.path("projectSuggestions").isArray()) {
                    Map<String, Object> updatedCache = aiCache == null ? new HashMap<>() : new HashMap<>(aiCache);
                    updatedCache.put("projectKey", projCacheKey);
                    updatedCache.put("projectResult", aiProjectResult.toString());
                    resume.setAnalysisAiCache(updatedCache);
                }
            }
            optimizationService.populateProjectSuggestions(
                    selectedProjects, aiProjectResult, resume.getExtractedText(), sugArr);
        }

        return out;
    }

    private void addSectionEval(ArrayNode arr, String sectionName, int score, String summary) {
        ObjectNode item = arr.addObject();
        item.put("sectionName", sectionName);
        item.put("category", sectionName);
        item.put("score", score);
        item.put("status", statusForScore(score));
        item.put("summary", summary);
        item.putArray("details");
    }

    private void addReadabilityCheck(ArrayNode arr, String label, boolean passed, String detail) {
        ObjectNode item = arr.addObject();
        item.put("label", label);
        item.put("passed", passed);
        item.put("detail", detail);
    }

    private int validateExperienceScore(int aiScore, int totalMonths, JsonNode structured) {
        int expCount = structured.path("experience").size();
        int projCount = structured.path("projects").size();
        if (expCount == 0 && projCount == 0) {
            return Math.min(aiScore, 25);
        }
        if (totalMonths == 0 && expCount == 0) {
            return Math.min(aiScore, 55);
        }
        return aiScore;
    }

    private int validateEducationScore(int aiScore, JsonNode structured) {
        if (!structured.path("education").isArray() || structured.path("education").isEmpty()) {
            return Math.min(aiScore, 40);
        }
        return aiScore;
    }

    private int calculateFormattingScore(int aiScore, JsonNode structured) {
        int checks = 0;
        JsonNode contact = structured.path("contact");
        if (!contact.path("fullName").asText("").isBlank())
            checks += 15;
        if (!contact.path("email").asText("").isBlank())
            checks += 15;
        if (!contact.path("phone").asText("").isBlank())
            checks += 10;
        if (structured.path("professionalSummary").asText("").length() >= 40)
            checks += 15;
        if (structured.path("skillCategories").size() > 0)
            checks += 15;
        if (structured.path("experience").size() > 0 || structured.path("projects").size() > 0)
            checks += 15;
        if (structured.path("education").size() > 0)
            checks += 15;

        // Deterministic: formatting is scored only from structural checks, not from a
        // subjective AI number
        return clampScore(checks);
    }

    private String sha256(String text) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String normalizeTerm(String text) {
        String t = text == null ? "" : text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#]+", " ").trim();
        StringBuilder sb = new StringBuilder();
        for (String tok : t.split("\\s+")) {
            if (tok.length() > 3 && tok.endsWith("s")) {
                tok = tok.substring(0, tok.length() - 1);
            }
            sb.append(tok).append(' ');
        }
        return " " + sb.toString().trim() + " ";
    }

    private boolean termInEvidence(String term, String normEvidence) {
        String nt = normalizeTerm(term);
        if (nt.isBlank()) {
            return false;
        }
        if (normEvidence.contains(nt)) {
            return true;
        }
        String[] tokens = nt.trim().split("\\s+");
        if (tokens.length < 2) {
            return false;
        }
        for (String tok : tokens) {
            if (tok.length() >= 3 && !normEvidence.contains(" " + tok + " ")) {
                return false;
            }
        }
        return true;
    }

    private void reconcileKeywords(ArrayNode matched, ArrayNode missing, JsonNode semanticMatches,
            String evidenceText) {
        String normEvidence = normalizeTerm(evidenceText);
        Set<String> semanticOk = new HashSet<>();
        if (semanticMatches != null && semanticMatches.isArray()) {
            for (JsonNode sm : semanticMatches) {
                String ev = sm.path("resumeEvidence").asText(sm.path("resumeTerm").asText(""));
                String jdTerm = sm.path("jdTerm").asText("");
                if (!isNonTechnicalOrSoftSkill(jdTerm) && !isNonTechnicalOrSoftSkill(ev)
                        && termInEvidence(ev, normEvidence)) {
                    semanticOk.add(normalizeTerm(jdTerm));
                }
            }
        }
        List<String> all = new ArrayList<>();
        matched.forEach(n -> all.add(n.asText()));
        missing.forEach(n -> all.add(n.asText()));
        matched.removeAll();
        missing.removeAll();
        for (String term : all) {
            if (isNonTechnicalOrSoftSkill(term)) {
                continue;
            }
            if (termInEvidence(term, normEvidence) || semanticOk.contains(normalizeTerm(term))) {
                matched.add(term);
            } else {
                missing.add(term);
            }
        }
    }

    private void copyMergedStrings(JsonNode primary, JsonNode secondary, ArrayNode dest) {
        Set<String> seen = new LinkedHashSet<>();
        for (JsonNode src : new JsonNode[] { primary, secondary }) {
            if (src != null && src.isArray()) {
                for (JsonNode n : src) {
                    String s = n.isTextual() ? n.asText("").trim() : n.path("name").asText(n.asText("")).trim();
                    if (s.isEmpty() || isNonTechnicalOrSoftSkill(s)) {
                        continue;
                    }
                    String key = s.toLowerCase(Locale.ROOT);
                    if (seen.add(key)) {
                        dest.add(s);
                    }
                }
            }
        }
    }

    private int clampScore(int score) {
        return Math.max(0, Math.min(100, score));
    }

    private String statusForScore(int score) {
        if (score >= 75)
            return "STRONG";
        if (score >= 50)
            return "MODERATE";
        return "NEEDS_WORK";
    }
}
