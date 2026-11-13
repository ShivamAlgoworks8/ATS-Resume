package com.atsresume.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class ResumeOptimizationService {

    private static final Pattern NUMBER_TOKEN = Pattern.compile("\\b\\d+(?:\\.\\d+)?%?\\b");
    private static final Pattern INSTRUCTION_PREFIX = Pattern.compile(
            "^(?i)\\s*(?:(?:please\\s+)?(?:add|include|insert|append)\\s+(?:a\\s+|the\\s+|following\\s+)?(?:sentence|bullet|line|statement|point|phrase|skill|keywords?)?(?:\\s+(?:such\\s+as|like|stating|to\\s+[^:]+))?"
                    + "|(?:please\\s+)?(?:rephrase|rewrite|revise|reword|change|update|replace|modify)(?:\\s+(?:this|the\\s+bullet|the\\s+summary|it))?(?:\\s+(?:to|as|with|like))?"
                    + "|(?:consider\\s+)?(?:adding|including|rephrasing|rewriting|mentioning|highlighting|stating)(?:\\s+(?:a\\s+sentence|a\\s+bullet|something)\\s+(?:such\\s+as|like))?"
                    + "|you\\s+(?:should|could|can|may)\\s+(?:mention|add|include|write|state|highlight|rephrase(?:\\s+to)?)"
                    + "|(?:suggested|recommended)\\s+(?:rewrite|change|bullet|summary|addition|text|phrasing)"
                    + "|for\\s+example|\\be\\.g\\.,?)\\s*[:\\-–—]?\\s*");
    private static final Pattern QUOTED_CONTENT = Pattern.compile(
            "^(?i)\\s*(?:add|include|insert|rephrase|rewrite|consider|you\\s+should|you\\s+could|suggested|recommended|try|use)[^\"'“‘]*[\"“'‘]([^\"”'’]{15,})[\"”'’]\\s*\\.?\\s*$");
    private static final Pattern PURE_INSTRUCTION_START = Pattern.compile(
            "^(?i)\\s*(?:add\\s+a\\s+|add\\s+more\\s+|include\\s+a\\s+|consider\\s+|you\\s+should\\b|you\\s+could\\b|make\\s+sure\\b|ensure\\s+that\\b|try\\s+to\\b|don't\\s+forget\\b|be\\s+sure\\s+to\\b|highlight\\s+your\\b|mention\\s+your\\b|emphasize\\s+your\\b|quantify\\s+your\\b|specify\\s+how\\b|state\\s+how\\b|rephrase\\s+this\\b|rewrite\\s+this\\b).*");

    private final ResumeParsingService parsingService;

    public ResumeOptimizationService(ResumeParsingService parsingService) {
        this.parsingService = parsingService;
    }

    public void populateSuggestions(JsonNode rawSuggestions, ArrayNode targetArray, String originalResumeText) {
        populateSuggestions(rawSuggestions, targetArray, null, originalResumeText);
    }

    public void populateSuggestions(JsonNode rawSuggestions, ArrayNode targetArray, JsonNode structured,
            String originalResumeText) {
        if (rawSuggestions == null || !rawSuggestions.isArray()) {
            return;
        }
        Set<String> allowedNumbers = extractNumbers(originalResumeText);
        int sugIdx = 1;

        for (JsonNode s : rawSuggestions) {
            String title = s.path("title").asText("").trim();
            String suggestedText = s.path("suggestedChange")
                    .asText(s.path("suggestedText").asText("")).trim();
            if (title.isEmpty() || suggestedText.isEmpty()) {
                continue;
            }
            String actionType = s.path("actionType").asText("ADVICE").trim().toUpperCase(Locale.ROOT);
            if (("REPLACE_BULLET".equals(actionType) || "REPLACE_SUMMARY".equals(actionType))
                    && hasInventedNumbers(suggestedText, allowedNumbers)) {
                actionType = "ADVICE";
            }

            String category = normalizeCategory(s.path("category").asText("EXPERIENCE_IMPROVEMENTS"));
            if ("PROJECT_IMPROVEMENTS".equals(category)) {
                // Project suggestions are generated separately by populateProjectSuggestions()
                continue;
            }
            if (("ADD_SKILL".equals(actionType) || "MISSING_SKILLS".equals(category))
                    && ResumeAnalysisService.isNonTechnicalOrSoftSkill(suggestedText)) {
                // Never suggest adding generic filler words or soft skills to the technical
                // skills list
                continue;
            }
            if ("REPLACE_SUMMARY".equals(actionType) || "SUMMARY_IMPROVEMENTS".equals(category)) {
                String cleanedSum = cleanResumeLine(suggestedText);
                if (!cleanedSum.isEmpty() && !isInstructionalPhrase(cleanedSum)) {
                    suggestedText = parsingService.capSummaryWords(cleanedSum, 80);
                }
            }
            String targetSection = s.path("targetSection").asText("Experience").trim();
            String originalText = s.path("originalText")
                    .asText(s.path("currentText").asText("")).trim();
            String currentIssue = s.path("currentIssue").asText("").trim();
            String reason = s.path("reason")
                    .asText(s.path("explanation").asText("Strengthens ATS keyword coverage and role alignment."))
                    .trim();

            int targetEntryIdx = s.path("targetEntryIndex").asInt(0);
            int targetBulletIdx = s.path("targetBulletIndex").asInt(0);
            String jobTitle = s.path("jobTitle").asText("").trim();
            String company = s.path("company").asText("").trim();

            if ("REPLACE_SUMMARY".equals(actionType) || "SUMMARY_IMPROVEMENTS".equals(category)
                    || targetSection.toLowerCase(Locale.ROOT).contains("summary")) {
                if (originalText.isEmpty() && structured != null) {
                    originalText = structured.path("originalSummary")
                            .asText(structured.path("professionalSummary").asText("")).trim();
                }
                if (currentIssue.isEmpty() || currentIssue.equalsIgnoreCase(originalText)) {
                    currentIssue = "Summary can be made more impactful, concise, and closely tailored to the target job description.";
                }
                if (reason.isEmpty()) {
                    reason = "Highlights relevant technical domain expertise and ATS keywords within the recommended word limit.";
                }
            } else if ("ADD_SKILL".equals(actionType) || "MISSING_SKILLS".equals(category)) {
                if (originalText.isEmpty()) {
                    originalText = "Skill not currently listed in your technical skills section.";
                }
                if (currentIssue.isEmpty() || currentIssue.equalsIgnoreCase(originalText)) {
                    currentIssue = "Target skill from the job description is missing from your resume.";
                }
                if (reason.isEmpty()) {
                    reason = "Directly improves your ATS keyword match score for the target role.";
                }
            } else if ("REPLACE_BULLET".equals(actionType) || "EXPERIENCE_IMPROVEMENTS".equals(category)
                    || targetSection.toLowerCase(Locale.ROOT).contains("experience")) {
                if (structured != null && structured.path("experience").isArray()
                        && !structured.path("experience").isEmpty()) {
                    ArrayNode expList = (ArrayNode) structured.path("experience");
                    int eIdx = Math.max(0, Math.min(targetEntryIdx, expList.size() - 1));
                    JsonNode expEntry = expList.get(eIdx);
                    if (jobTitle.isEmpty()) {
                        jobTitle = expEntry.path("jobTitle").asText("").trim();
                    }
                    if (company.isEmpty()) {
                        company = expEntry.path("company").asText("").trim();
                    }
                    if (originalText.isEmpty() && expEntry.path("bullets").isArray()
                            && !expEntry.path("bullets").isEmpty()) {
                        ArrayNode bullets = (ArrayNode) expEntry.path("bullets");
                        int bIdx = Math.max(0, Math.min(targetBulletIdx, bullets.size() - 1));
                        originalText = bullets.get(bIdx).asText("").trim();
                    }
                }
                if (currentIssue.isEmpty() || currentIssue.equalsIgnoreCase(originalText)) {
                    currentIssue = "Bullet phrasing lacks strong action verbs, quantifiable achievements, or ATS keyword coverage.";
                }
                if (reason.isEmpty()) {
                    reason = "Quantifies achievements and incorporates high-priority action verbs from the target job description.";
                }
            } else {
                if (originalText.isEmpty()) {
                    originalText = currentIssue.isEmpty() ? "Current resume content" : currentIssue;
                }
                if (currentIssue.isEmpty()) {
                    currentIssue = "Content can be formatted and worded for higher ATS readability.";
                }
            }

            ObjectNode item = targetArray.addObject();
            item.put("id", "sug-" + sugIdx++);
            item.put("category", category);
            item.put("priority", normalizePriority(s.path("priority").asText("medium")));
            item.put("title", title);
            item.put("targetSection", targetSection.isEmpty() ? "Experience" : targetSection);
            if (!jobTitle.isEmpty()) {
                item.put("jobTitle", jobTitle);
            }
            if (!company.isEmpty()) {
                item.put("company", company);
            }
            item.put("currentIssue", currentIssue);
            item.put("reason", reason);
            item.put("explanation", reason);
            item.put("suggestedChange", suggestedText);
            item.put("suggestedText", suggestedText);
            if (!originalText.isEmpty()) {
                item.put("originalText", originalText);
                item.put("currentText", originalText);
            }
            item.put("requiresCandidateVerification",
                    "ADD_SKILL".equals(actionType) || "MISSING_SKILLS".equals(category));
            item.put("decision", "PENDING");
            item.put("approved", !"ADVICE".equals(actionType));
            item.put("actionType", actionType);
            item.put("targetEntryIndex", targetEntryIdx);
            item.put("targetBulletIndex", targetBulletIdx);
        }
    }

    /**
     * Requests JD-aligned bullet improvements from Groq for every selected project
     * (indices 0..N-1).
     */
    public JsonNode fetchProjectSuggestionsFromAi(
            JsonNode projects,
            JsonNode skillCategories,
            String jd) {

        if (projects == null || !projects.isArray() || projects.isEmpty()) {
            return null;
        }

        String systemPrompt = """
                You are an honest, detail-oriented ATS resume editor. Review EVERY project in "projects" (indices 0 to N-1) against "jobDescription".
                Rules:
                1. Return EXACTLY one entry in "projectSuggestions" for EVERY project index (0 through N-1). Do NOT skip, merge, or duplicate any project.
                2. For each project, rewrite its "bullets" into "improvedBullets" using clear, professional, action-oriented, JD-relevant wording while 100% preserving the project's original meaning, architecture, features, technologies, and real details.
                3. Keep all technologies, tools, metrics, numbers, and achievements strictly truthful to that project and the candidate's "skillCategories". NEVER invent technologies, tools, features, metrics, or claims.
                4. Never reveal confidential client names or use meta-advice phrases like "Add...", "Consider...", "Rephrase to...", "You should...".
                5. Provide a concise "issue" (weak wording, unclear framing, or under-highlighted JD relevance in the original description) and "reason" (why the rewrite improves clarity and JD fit).
                Return ONLY JSON:
                {
                  "projectSuggestions": [
                    {
                      "projectIndex": 0,
                      "improvedBullets": [""],
                      "issue": "",
                      "reason": ""
                    }
                  ]
                }
                """;

        ObjectNode payload = parsingService.createObjectNode();
        ArrayNode projectsForPrompt = payload.putArray("projects");
        int pIdx = 0;
        for (JsonNode p : projects) {
            ObjectNode pn = projectsForPrompt.addObject();
            pn.put("projectIndex", pIdx++);
            pn.put("title", p.path("title").asText(""));
            if (!p.path("technologies").asText("").isBlank()) {
                pn.put("technologies", p.path("technologies").asText(""));
            }
            pn.set("bullets", p.path("bullets"));
        }
        if (skillCategories != null && skillCategories.isArray()) {
            payload.set("skillCategories", skillCategories);
        }
        payload.put("jobDescription", jd == null ? "" : jd);

        return parsingService.callGroqJson(systemPrompt, payload.toString());
    }

    /**
     * Validates and appends one PROJECT_IMPROVEMENTS suggestion per project (no
     * skipping,
     * merging, or duplication) showing original bullets alongside improved
     * JD-relevant bullets.
     */
    public void populateProjectSuggestions(
            JsonNode projects,
            JsonNode ai,
            String originalResumeText,
            ArrayNode targetArray) {

        if (projects == null || !projects.isArray() || projects.isEmpty()
                || ai == null || !ai.path("projectSuggestions").isArray()) {
            return;
        }

        Map<Integer, JsonNode> aiByProject = new HashMap<>();
        for (JsonNode s : ai.path("projectSuggestions")) {
            int pi = s.path("projectIndex").asInt(-1);
            if (pi >= 0 && pi < projects.size()) {
                aiByProject.putIfAbsent(pi, s);
            }
        }

        Set<String> allowedNumbers = extractNumbers(originalResumeText);
        int sugIdx = targetArray.size() + 1;

        for (int pi = 0; pi < projects.size(); pi++) {
            JsonNode project = projects.get(pi);
            JsonNode existingBulletsNode = project.path("bullets");
            List<String> origBullets = new ArrayList<>();
            if (existingBulletsNode.isArray()) {
                for (JsonNode b : existingBulletsNode) {
                    String txt = b.asText("").trim();
                    if (!txt.isEmpty()) {
                        origBullets.add(txt);
                    }
                }
            }
            if (origBullets.isEmpty()) {
                continue;
            }

            JsonNode aiEntry = aiByProject.get(pi);
            if (aiEntry == null || !aiEntry.path("improvedBullets").isArray()) {
                continue;
            }

            List<String> improvedBullets = new ArrayList<>();
            JsonNode rawImproved = aiEntry.path("improvedBullets");
            for (int bi = 0; bi < rawImproved.size(); bi++) {
                String cleaned = cleanResumeLine(rawImproved.get(bi).asText(""));
                if (!cleaned.isEmpty()
                        && !isInstructionalPhrase(cleaned)
                        && !hasInventedNumbers(cleaned, allowedNumbers)) {
                    improvedBullets.add(cleaned);
                } else if (bi < origBullets.size()) {
                    improvedBullets.add(origBullets.get(bi));
                }
            }
            if (improvedBullets.isEmpty() || improvedBullets.equals(origBullets)) {
                continue;
            }

            String projectTitle = project.path("title").asText("Project " + (pi + 1)).trim();
            String tech = project.path("technologies").asText("").trim();
            String issue = aiEntry.path("issue").asText("").trim();
            String reason = aiEntry.path("reason").asText("").trim();

            String origDisplay = formatBulletsText(origBullets);
            String improvedDisplay = formatBulletsText(improvedBullets);

            ObjectNode item = targetArray.addObject();
            item.put("id", "sug-" + sugIdx++);
            item.put("category", "PROJECT_IMPROVEMENTS");
            item.put("priority", "medium");
            item.put("title", "Improve Project: " + projectTitle);
            item.put("targetSection", "Projects");
            item.put("projectTitle", projectTitle);
            if (!tech.isEmpty()) {
                item.put("projectTechnologies", tech);
            }
            ArrayNode origArr = item.putArray("originalBullets");
            origBullets.forEach(origArr::add);
            ArrayNode impArr = item.putArray("improvedBullets");
            improvedBullets.forEach(impArr::add);

            item.put("currentIssue", issue.isEmpty()
                    ? "Project wording can be clarified and better aligned with JD terminology without altering real details."
                    : issue);
            item.put("reason", reason.isEmpty()
                    ? "Improves clarity, action-verb strength, and alignment with the target job description."
                    : reason);
            item.put("explanation", item.path("reason").asText());
            item.put("suggestedChange", improvedDisplay);
            item.put("suggestedText", improvedDisplay);
            item.put("originalText", origDisplay);
            item.put("currentText", origDisplay);
            item.put("requiresCandidateVerification", false);
            item.put("decision", "PENDING");
            item.put("approved", true);
            item.put("actionType", "REPLACE_BULLET");
            item.put("targetEntryIndex", pi);
            item.put("targetBulletIndex", 0);
        }
    }

    private String formatBulletsText(List<String> bullets) {
        if (bullets.size() == 1) {
            return bullets.get(0);
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < bullets.size(); i++) {
            if (i > 0) {
                sb.append('\n');
            }
            sb.append("• ").append(bullets.get(i));
        }
        return sb.toString();
    }

    public void applyApprovedSuggestions(
            ObjectNode structured,
            JsonNode suggestions,
            Set<String> approvedIds,
            String originalResumeText) {
        applyApprovedSuggestions(structured, suggestions, approvedIds, "", originalResumeText);
    }

    public void applyApprovedSuggestions(
            ObjectNode structured,
            JsonNode suggestions,
            Set<String> approvedIds,
            String jd,
            String originalResumeText) {

        if (suggestions == null || !suggestions.isArray() || approvedIds == null || approvedIds.isEmpty()) {
            return;
        }
        Set<String> allowedNumbers = extractNumbers(originalResumeText);

        ArrayNode approvedList = parsingService.createObjectNode().putArray("approved");
        for (JsonNode s : suggestions) {
            if (approvedIds.contains(s.path("id").asText(""))) {
                approvedList.add(s);
            }
        }
        if (approvedList.isEmpty()) {
            return;
        }

        boolean needsAiRewrite = false;
        for (JsonNode s : approvedList) {
            String cat = s.path("category").asText("");
            String act = s.path("actionType").asText("");
            if (!"PROJECT_IMPROVEMENTS".equals(cat) && !"ADD_SKILL".equals(act) && !"MISSING_SKILLS".equals(cat)) {
                needsAiRewrite = true;
                break;
            }
        }

        boolean aiApplied = needsAiRewrite
                && rewriteResumeWithAi(structured, approvedList, jd, allowedNumbers, originalResumeText);
        if (!aiApplied) {
            applyDeterministicRewrites(structured, approvedList, allowedNumbers, originalResumeText);
        } else {
            // Approved project suggestions were already validated; apply their exact text.
            ArrayNode projectOnly = parsingService.createObjectNode().putArray("projectApproved");
            for (JsonNode s : approvedList) {
                if ("PROJECT_IMPROVEMENTS".equals(s.path("category").asText(""))) {
                    projectOnly.add(s);
                }
            }
            if (!projectOnly.isEmpty()) {
                applyDeterministicRewrites(structured, projectOnly, allowedNumbers, originalResumeText);
            }
        }
        sanitizeFinalResumeSections(structured);
    }

    private boolean rewriteResumeWithAi(
            ObjectNode structured,
            ArrayNode approvedList,
            String jd,
            Set<String> allowedNumbers,
            String originalResumeText) {

        String systemPrompt = """
                You are an expert ATS resume writer. Convert the approved improvement recommendations into professionally rewritten resume content and return strict JSON.
                Rules:
                1. Treat the approved suggestions as recommendations, NOT as literal text to copy-paste.
                2. Rewrite the candidate's actual "professionalSummary" (approximately 75 to 80 words, strictly maximum 80 words), "experience" bullets, and "projects" bullets so they read as polished, first-person-implied resume statements.
                3. NEVER include instruction phrases such as "Add a sentence such as:", "Rephrase to:", "Consider adding:", "You should mention:", "Highlight", or any meta-advice in the output.
                4. Preserve 100% of the candidate's original facts, companies, roles, dates, skills, and metrics. Never invent numbers, achievements, or technologies not supported by the original resume.
                JSON schema:
                {
                  "professionalSummary": "",
                  "skillsToAdd": [""],
                  "experienceBullets": [{ "entryIndex": 0, "bullets": [""] }],
                  "projectBullets": [{ "entryIndex": 0, "bullets": [""] }]
                }
                """;

        ObjectNode userPayload = parsingService.createObjectNode();
        userPayload.put("professionalSummary", structured.path("professionalSummary").asText(""));
        userPayload.set("skillCategories", structured.path("skillCategories"));
        userPayload.set("experience", structured.path("experience"));
        userPayload.set("projects", structured.path("projects"));
        userPayload.set("approvedRecommendations", approvedList);
        if (jd != null && !jd.isBlank()) {
            userPayload.put("jobDescription", jd);
        }

        JsonNode aiNode = parsingService.callGroqJson(systemPrompt, userPayload.toString());
        if (aiNode == null || !aiNode.isObject()) {
            return false;
        }

        String newSummary = parsingService.capSummaryWords(
                cleanResumeLine(aiNode.path("professionalSummary").asText("")), 80);
        if (newSummary.length() >= 30
                && !isInstructionalPhrase(newSummary)
                && !hasInventedNumbers(newSummary, allowedNumbers)) {
            structured.put("professionalSummary", newSummary);
        }

        if (aiNode.path("skillsToAdd").isArray()) {
            for (JsonNode sk : aiNode.path("skillsToAdd")) {
                addCleanSkill(structured, sk.asText(""), originalResumeText, true);
            }
        }

        applyRewrittenBullets(structured.path("experience"), aiNode.path("experienceBullets"), allowedNumbers);
        applyRewrittenBullets(structured.path("projects"), aiNode.path("projectBullets"), allowedNumbers);
        return true;
    }

    private void applyRewrittenBullets(JsonNode entriesNode, JsonNode rewrittenArr, Set<String> allowedNumbers) {
        if (!entriesNode.isArray() || !rewrittenArr.isArray()) {
            return;
        }
        ArrayNode entries = (ArrayNode) entriesNode;
        for (JsonNode item : rewrittenArr) {
            int idx = item.path("entryIndex").asInt(-1);
            if (idx < 0 || idx >= entries.size() || !item.path("bullets").isArray()) {
                continue;
            }
            String origTitle = entries.get(idx).path("originalTitle")
                    .asText(entries.get(idx).path("title").asText(""));
            ArrayNode cleanBullets = parsingService.createObjectNode().putArray("bullets");
            for (JsonNode b : item.path("bullets")) {
                String cleaned = cleanResumeLine(b.asText(""));
                if (!origTitle.isEmpty()) {
                    cleaned = sanitizeProjectBullet(cleaned, origTitle);
                }
                if (!cleaned.isEmpty()
                        && !isInstructionalPhrase(cleaned)
                        && !hasInventedNumbers(cleaned, allowedNumbers)) {
                    cleanBullets.add(cleaned);
                }
            }
            if (!cleanBullets.isEmpty()) {
                ((ObjectNode) entries.get(idx)).set("bullets", cleanBullets);
            }
        }
    }

    private void applyDeterministicRewrites(
            ObjectNode structured,
            ArrayNode approvedList,
            Set<String> allowedNumbers,
            String originalResumeText) {

        for (JsonNode s : approvedList) {
            String action = s.path("actionType").asText("ADVICE").trim().toUpperCase(Locale.ROOT);
            String category = s.path("category").asText("").trim().toUpperCase(Locale.ROOT);
            String rawSuggested = s.path("suggestedChange").asText(s.path("suggestedText").asText("")).trim();
            String current = s.path("originalText").asText(s.path("currentText").asText("")).trim();
            if (rawSuggested.isEmpty()) {
                continue;
            }

            boolean isAddSentence = rawSuggested.matches(
                    "^(?i)\\s*(?:please\\s+)?(?:add|include|insert|append)\\s+(?:a\\s+)?(?:sentence|line|statement).*");
            String cleaned = cleanResumeLine(rawSuggested);
            if (cleaned.isEmpty() || isInstructionalPhrase(cleaned)) {
                continue;
            }

            if (("REPLACE_SUMMARY".equals(action) || "SUMMARY_IMPROVEMENTS".equals(category))
                    && !hasInventedNumbers(cleaned, allowedNumbers)) {
                String existingSummary = structured.path("professionalSummary").asText("").trim();
                String updatedSummary;
                if (isAddSentence && !existingSummary.isEmpty() && !existingSummary.contains(cleaned)) {
                    String sep = existingSummary.endsWith(".") ? " " : ". ";
                    updatedSummary = existingSummary + sep + cleaned;
                } else {
                    updatedSummary = cleaned;
                }
                structured.put("professionalSummary", parsingService.capSummaryWords(updatedSummary, 80));
            } else if ("ADD_SKILL".equals(action) || "MISSING_SKILLS".equals(category)) {
                addCleanSkill(structured, cleaned, originalResumeText, true);
            } else if ("PROJECT_IMPROVEMENTS".equals(category) && s.path("improvedBullets").isArray()
                    && !s.path("improvedBullets").isEmpty()) {
                if (structured.path("projects").isArray() && !structured.path("projects").isEmpty()) {
                    ArrayNode projects = (ArrayNode) structured.path("projects");
                    String projTitle = s.path("projectTitle").asText("").trim();
                    int targetIdx = -1;
                    int hintIdx = s.path("targetEntryIndex").asInt(-1);
                    if (hintIdx >= 0 && hintIdx < projects.size()
                            && (projTitle.isEmpty() || projects.get(hintIdx).path("title").asText("").trim()
                                    .equalsIgnoreCase(projTitle))) {
                        targetIdx = hintIdx;
                    } else if (!projTitle.isEmpty()) {
                        for (int i = 0; i < projects.size(); i++) {
                            if (projects.get(i).path("title").asText("").trim().equalsIgnoreCase(projTitle)) {
                                targetIdx = i;
                                break;
                            }
                        }
                    }
                    if (targetIdx < 0 && hintIdx >= 0 && hintIdx < projects.size()) {
                        targetIdx = hintIdx;
                    }
                    if (targetIdx >= 0) {
                        ArrayNode newBullets = parsingService.createObjectNode().putArray("bullets");
                        for (JsonNode b : s.path("improvedBullets")) {
                            String bt = cleanResumeLine(b.asText(""));
                            if (!bt.isEmpty() && !isInstructionalPhrase(bt)
                                    && !hasInventedNumbers(bt, allowedNumbers)) {
                                newBullets.add(bt);
                            }
                        }
                        if (!newBullets.isEmpty()) {
                            ((ObjectNode) projects.get(targetIdx)).set("bullets", newBullets);
                        }
                    }
                }
            } else if (!hasInventedNumbers(cleaned, allowedNumbers)) {
                boolean isProject = "PROJECT_IMPROVEMENTS".equals(category)
                        || s.path("targetSection").asText("").toLowerCase(Locale.ROOT).contains("project");
                String section = isProject ? "projects" : "experience";
                if (structured.path(section).isArray() && !structured.path(section).isEmpty()) {
                    ArrayNode entries = (ArrayNode) structured.path(section);
                    boolean replaced = false;
                    if (!current.isEmpty()) {
                        for (JsonNode entry : entries) {
                            if (entry.path("bullets").isArray()) {
                                ArrayNode bullets = (ArrayNode) entry.path("bullets");
                                for (int i = 0; i < bullets.size(); i++) {
                                    if (bullets.get(i).asText("").trim().equalsIgnoreCase(current)) {
                                        bullets.set(i, structured.textNode(cleaned));
                                        replaced = true;
                                        break;
                                    }
                                }
                            }
                            if (replaced)
                                break;
                        }
                    }
                    if (!replaced) {
                        int eIdx = Math.min(Math.max(s.path("targetEntryIndex").asInt(0), 0), entries.size() - 1);
                        if (entries.get(eIdx).path("bullets").isArray()) {
                            ArrayNode bullets = (ArrayNode) entries.get(eIdx).path("bullets");
                            if (!bullets.isEmpty()) {
                                int bIdx = Math.min(Math.max(s.path("targetBulletIndex").asInt(0), 0),
                                        bullets.size() - 1);
                                bullets.set(bIdx, structured.textNode(cleaned));
                            } else {
                                bullets.add(cleaned);
                            }
                        }
                    }
                }
            }
        }
    }

    private void addCleanSkill(ObjectNode structured, String rawSkillText, String originalResumeText,
            boolean userApproved) {
        if (rawSkillText == null || rawSkillText.isBlank()) {
            return;
        }
        String stripped = cleanResumeLine(rawSkillText)
                .replaceAll("(?i)\\s+(?:to|in)\\s+(?:your\\s+|the\\s+)?(?:skills?|resume|section).*$", "")
                .trim();
        for (String part : stripped.split("[,;/]+")) {
            String sk = part.trim();
            if (sk.isEmpty() || sk.length() > 35 || isInstructionalPhrase(sk)
                    || ResumeAnalysisService.isNonTechnicalOrSoftSkill(sk)) {
                continue;
            }
            if (!userApproved && !parsingService.appearsInText(sk, originalResumeText)) {
                continue;
            }
            if (structured.path("skillCategories").isArray() && !structured.path("skillCategories").isEmpty()) {
                ArrayNode cats = (ArrayNode) structured.path("skillCategories");
                boolean exists = false;
                for (JsonNode cat : cats) {
                    for (JsonNode existing : cat.path("skills")) {
                        if (existing.asText("").trim().equalsIgnoreCase(sk)) {
                            exists = true;
                            break;
                        }
                    }
                }
                if (!exists) {
                    ((ArrayNode) cats.get(cats.size() - 1).path("skills")).add(sk);
                }
            }
        }
    }

    public String buildOptimizedProfileSummary(
            String aiSummary,
            JsonNode structured,
            String originalResumeText) {
        Set<String> allowedNumbers = extractNumbers(originalResumeText);
        String cleaned = parsingService.capSummaryWords(cleanResumeLine(aiSummary), 80);
        if (cleaned.length() >= 30
                && !isInstructionalPhrase(cleaned)
                && !hasInventedNumbers(cleaned, allowedNumbers)) {
            return cleaned;
        }
        String existing = parsingService.capSummaryWords(
                cleanResumeLine(structured.path("professionalSummary").asText("")), 80);
        return existing;
    }

    private void sanitizeFinalResumeSections(ObjectNode structured) {
        String summary = parsingService.capSummaryWords(
                cleanResumeLine(structured.path("professionalSummary").asText("")), 80);
        structured.put("professionalSummary", summary);

        for (String sec : new String[] { "experience", "projects" }) {
            if (structured.path(sec).isArray()) {
                for (JsonNode entry : structured.path(sec)) {
                    if (entry.path("bullets").isArray()) {
                        ArrayNode bullets = (ArrayNode) entry.path("bullets");
                        for (int i = bullets.size() - 1; i >= 0; i--) {
                            String b = cleanResumeLine(bullets.get(i).asText(""));
                            if (b.isEmpty() || isInstructionalPhrase(b)) {
                                if (bullets.size() > 1) {
                                    bullets.remove(i);
                                }
                            } else {
                                bullets.set(i, structured.textNode(b));
                            }
                        }
                    }
                }
            }
        }
    }

    public String cleanResumeLine(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String t = text.trim();
        Matcher qm = QUOTED_CONTENT.matcher(t);
        if (qm.matches()) {
            t = qm.group(1).trim();
        } else {
            t = INSTRUCTION_PREFIX.matcher(t).replaceFirst("").trim();
        }
        if ((t.startsWith("\"") && t.endsWith("\""))
                || (t.startsWith("'") && t.endsWith("'"))
                || (t.startsWith("“") && t.endsWith("”"))
                || (t.startsWith("‘") && t.endsWith("’"))) {
            t = t.substring(1, t.length() - 1).trim();
        }
        t = INSTRUCTION_PREFIX.matcher(t).replaceFirst("").trim();
        return t;
    }

    public boolean isInstructionalPhrase(String text) {
        if (text == null || text.isBlank()) {
            return true;
        }
        String t = text.trim();
        if (PURE_INSTRUCTION_START.matcher(t).matches()) {
            return true;
        }
        String lower = t.toLowerCase(Locale.ROOT);
        return lower.contains("add a sentence")
                || lower.contains("rephrase to")
                || lower.contains("consider adding")
                || lower.contains("you should mention")
                || lower.contains("in your resume")
                || lower.contains("in the summary section")
                || lower.contains("to your skills section");
    }

    public ArrayNode selectAndSanitizeProjects(
            JsonNode originalProjects,
            JsonNode aiSanitizedProjects,
            String jd,
            String originalResumeText) {

        ArrayNode result = parsingService.createObjectNode().putArray("projects");
        if (originalProjects == null || !originalProjects.isArray() || originalProjects.isEmpty()) {
            return result;
        }

        int total = originalProjects.size();
        Set<String> allowedNumbers = extractNumbers(originalResumeText);
        Map<Integer, JsonNode> aiByIndex = new HashMap<>();
        if (aiSanitizedProjects != null && aiSanitizedProjects.isArray()) {
            for (JsonNode sp : aiSanitizedProjects) {
                int idx = sp.path("originalIndex").asInt(-1);
                if (idx >= 0 && idx < total) {
                    aiByIndex.putIfAbsent(idx, sp);
                }
            }
        }

        // Preserve ALL projects in exact order when <= 10; pick top 10 by JD relevance
        // when > 10.
        List<Integer> selectedIndices = new ArrayList<>();
        if (total <= 10) {
            for (int i = 0; i < total; i++) {
                selectedIndices.add(i);
            }
        } else {
            List<Integer> ranked = new ArrayList<>();
            for (int i = 0; i < total; i++) {
                ranked.add(i);
            }
            ranked.sort((a, b) -> {
                int sa = scoreProjectRelevance(originalProjects.get(a), jd) + (aiByIndex.containsKey(a) ? 2 : 0);
                int sb = scoreProjectRelevance(originalProjects.get(b), jd) + (aiByIndex.containsKey(b) ? 2 : 0);
                int cmp = Integer.compare(sb, sa);
                return cmp != 0 ? cmp : Integer.compare(a, b);
            });
            selectedIndices.addAll(ranked.subList(0, 10));
        }

        Set<String> usedTitles = new HashSet<>();
        int projIdx = 1;
        for (int origIdx : selectedIndices) {
            JsonNode orig = originalProjects.get(origIdx);
            JsonNode aiNode = aiByIndex.get(origIdx);

            String origTitle = orig.path("originalTitle").asText(orig.path("title").asText("")).trim();
            String tech = orig.path("technologies").asText("").trim();
            String aiTitle = aiNode == null
                    ? ""
                    : aiNode.path("genericTitle").asText(aiNode.path("title").asText("")).trim();

            String genericTitle = sanitizeProjectTitle(aiTitle, origTitle, tech);
            if (!usedTitles.add(genericTitle.toLowerCase(Locale.ROOT))) {
                genericTitle = genericTitle + " (" + projIdx + ")";
                usedTitles.add(genericTitle.toLowerCase(Locale.ROOT));
            }

            ObjectNode pNode = result.addObject();
            pNode.put("id", "proj-" + projIdx++);
            pNode.put("title", genericTitle);
            pNode.put("originalTitle", origTitle);
            pNode.put("technologies", tech);
            pNode.put("link", "");
            pNode.put("startDate", orig.path("startDate").asText("").trim());
            pNode.put("endDate", orig.path("endDate").asText("").trim());

            JsonNode origBullets = orig.path("originalBullets").isArray() && !orig.path("originalBullets").isEmpty()
                    ? orig.path("originalBullets")
                    : orig.path("bullets");
            pNode.set("originalBullets", origBullets.deepCopy());

            // Keep original bullet details intact (only masking confidential exact project
            // name)
            // so Project Suggestions can display true Existing vs Improved wording with
            // Approve/Reject.
            ArrayNode bullets = pNode.putArray("bullets");
            if (origBullets.isArray()) {
                for (JsonNode b : origBullets) {
                    String bText = sanitizeProjectBullet(b.asText("").trim(), origTitle);
                    if (!bText.isEmpty()) {
                        bullets.add(bText);
                    }
                }
            }
            if (bullets.isEmpty() && aiNode != null && aiNode.path("sanitizedBullets").isArray()) {
                for (JsonNode b : aiNode.path("sanitizedBullets")) {
                    String bText = sanitizeProjectBullet(b.asText("").trim(), origTitle);
                    if (!bText.isEmpty() && !hasInventedNumbers(bText, allowedNumbers)) {
                        bullets.add(bText);
                    }
                }
            }
        }
        return result;
    }

    private int scoreProjectRelevance(JsonNode proj, String jd) {
        if (proj == null || jd == null || jd.isBlank()) {
            return 0;
        }
        String projText = (proj.path("title").asText("") + " "
                + proj.path("technologies").asText("") + " "
                + proj.path("bullets").toString()).toLowerCase(Locale.ROOT);
        int score = 0;
        for (String token : jd.toLowerCase(Locale.ROOT).split("[^a-z0-9+#.]+")) {
            if (token.length() >= 3 && projText.contains(token)) {
                score++;
            }
        }
        return score;
    }

    private String sanitizeProjectTitle(String aiTitle, String origTitle, String tech) {
        String cleanOrig = origTitle
                .replaceAll("^(?:\\d+\\s*\\|\\s*|(?i)project\\s*\\d*\\s*[:\\-]\\s*)", "")
                .replaceAll("\\s*[—–\\-]\\s*[^—–\\-]+$", "")
                .trim();
        if (!aiTitle.isEmpty() && !aiTitle.equalsIgnoreCase(origTitle) && !aiTitle.equalsIgnoreCase(cleanOrig)) {
            return aiTitle.replaceAll("^(?:\\d+\\s*\\|\\s*|(?i)project\\s*\\d*\\s*[:\\-]\\s*)", "").trim();
        }
        if (!tech.isEmpty()) {
            String primaryTech = tech.split("[,|/]+")[0].trim();
            return primaryTech + " Enterprise Application & Workflow System";
        }
        return "Enterprise Software & Workflow Platform";
    }

    private String sanitizeProjectBullet(String bullet, String origTitle) {
        if (bullet == null || bullet.isBlank()) {
            return "";
        }
        String cleaned = cleanResumeLine(bullet);
        if (cleaned.isEmpty() || isInstructionalPhrase(cleaned)) {
            return "";
        }
        String cleanName = origTitle
                .replaceAll("^(?:\\d+\\s*\\|\\s*|(?i)project\\s*\\d*\\s*[:\\-]\\s*)", "")
                .split("\\s*[—–\\-]\\s*")[0]
                .trim();
        if (cleanName.length() >= 3) {
            cleaned = cleaned.replaceAll("(?i)" + Pattern.quote(cleanName), "the platform");
        }
        return cleaned.replaceAll("\\s+", " ").trim();
    }

    private Set<String> extractNumbers(String text) {
        Set<String> nums = new HashSet<>();
        if (text == null) {
            return nums;
        }
        Matcher m = NUMBER_TOKEN.matcher(text);
        while (m.find()) {
            nums.add(m.group().replace("%", ""));
        }
        return nums;
    }

    private boolean hasInventedNumbers(String text, Set<String> allowedNumbers) {
        Matcher m = NUMBER_TOKEN.matcher(text == null ? "" : text);
        while (m.find()) {
            String raw = m.group().replace("%", "");
            if (!allowedNumbers.contains(raw)) {
                return true;
            }
        }
        return false;
    }

    private String normalizeCategory(String cat) {
        String c = cat == null ? "" : cat.trim().toUpperCase(Locale.ROOT);
        return switch (c) {
            case "MISSING_SKILLS", "SKILLS" -> "MISSING_SKILLS";
            case "MISSING_KEYWORDS", "KEYWORDS" -> "MISSING_KEYWORDS";
            case "SUMMARY_IMPROVEMENTS", "SUMMARY" -> "SUMMARY_IMPROVEMENTS";
            case "EXPERIENCE_IMPROVEMENTS", "EXPERIENCE" -> "EXPERIENCE_IMPROVEMENTS";
            case "PROJECT_IMPROVEMENTS", "PROJECTS" -> "PROJECT_IMPROVEMENTS";
            case "ACHIEVEMENTS_METRICS", "ACHIEVEMENTS", "METRICS" -> "ACHIEVEMENTS_METRICS";
            case "FORMATTING_IMPROVEMENTS", "FORMATTING" -> "FORMATTING_IMPROVEMENTS";
            case "CONTENT_REMOVAL" -> "CONTENT_REMOVAL";
            default -> "EXPERIENCE_IMPROVEMENTS";
        };
    }

    private String normalizePriority(String p) {
        String v = p == null ? "" : p.trim().toLowerCase(Locale.ROOT);
        return switch (v) {
            case "high", "medium", "low" -> v;
            default -> "medium";
        };
    }
}
