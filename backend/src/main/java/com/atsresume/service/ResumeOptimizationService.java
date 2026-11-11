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
            String targetSection = s.path("targetSection").asText("Experience").trim();
            String originalText = s.path("originalText")
                    .asText(s.path("currentText").asText("")).trim();
            String currentIssue = s.path("currentIssue")
                    .asText(!originalText.isEmpty()
                            ? originalText
                            : "This section can be better tailored to match the job description requirements.")
                    .trim();
            String reason = s.path("reason")
                    .asText(s.path("explanation").asText("Strengthens ATS keyword coverage and role alignment."))
                    .trim();

            ObjectNode item = targetArray.addObject();
            item.put("id", "sug-" + sugIdx++);
            item.put("category", category);
            item.put("priority", normalizePriority(s.path("priority").asText("medium")));
            item.put("title", title);
            item.put("targetSection", targetSection.isEmpty() ? "Experience" : targetSection);
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
            if (s.hasNonNull("targetEntryIndex")) {
                item.put("targetEntryIndex", s.path("targetEntryIndex").asInt(0));
            }
            if (s.hasNonNull("targetBulletIndex")) {
                item.put("targetBulletIndex", s.path("targetBulletIndex").asInt(0));
            }
        }
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

        boolean aiApplied = rewriteResumeWithAi(structured, approvedList, jd, allowedNumbers, originalResumeText);
        if (!aiApplied) {
            applyDeterministicRewrites(structured, approvedList, allowedNumbers, originalResumeText);
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
                2. Rewrite the candidate's actual "professionalSummary", "experience" bullets, and "projects" bullets so they read as polished, first-person-implied resume statements.
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

        String newSummary = cleanResumeLine(aiNode.path("professionalSummary").asText(""));
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

            boolean isAddSentence = rawSuggested.matches("^(?i)\\s*(?:please\\s+)?(?:add|include|insert|append)\\s+(?:a\\s+)?(?:sentence|line|statement).*");
            String cleaned = cleanResumeLine(rawSuggested);
            if (cleaned.isEmpty() || isInstructionalPhrase(cleaned)) {
                continue;
            }

            if (("REPLACE_SUMMARY".equals(action) || "SUMMARY_IMPROVEMENTS".equals(category))
                    && !hasInventedNumbers(cleaned, allowedNumbers)) {
                String existingSummary = structured.path("professionalSummary").asText("").trim();
                if (isAddSentence && !existingSummary.isEmpty() && !existingSummary.contains(cleaned)) {
                    String sep = existingSummary.endsWith(".") ? " " : ". ";
                    structured.put("professionalSummary", existingSummary + sep + cleaned);
                } else {
                    structured.put("professionalSummary", cleaned);
                }
            } else if ("ADD_SKILL".equals(action) || "MISSING_SKILLS".equals(category)) {
                addCleanSkill(structured, cleaned, originalResumeText, true);
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
                            if (replaced) break;
                        }
                    }
                    if (!replaced) {
                        int eIdx = Math.min(Math.max(s.path("targetEntryIndex").asInt(0), 0), entries.size() - 1);
                        if (entries.get(eIdx).path("bullets").isArray()) {
                            ArrayNode bullets = (ArrayNode) entries.get(eIdx).path("bullets");
                            if (!bullets.isEmpty()) {
                                int bIdx = Math.min(Math.max(s.path("targetBulletIndex").asInt(0), 0), bullets.size() - 1);
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

    private void addCleanSkill(ObjectNode structured, String rawSkillText, String originalResumeText, boolean userApproved) {
        if (rawSkillText == null || rawSkillText.isBlank()) {
            return;
        }
        String stripped = cleanResumeLine(rawSkillText)
                .replaceAll("(?i)\\s+(?:to|in)\\s+(?:your\\s+|the\\s+)?(?:skills?|resume|section).*$", "")
                .trim();
        for (String part : stripped.split("[,;/]+")) {
            String sk = part.trim();
            if (sk.isEmpty() || sk.length() > 35 || isInstructionalPhrase(sk)) {
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

    private void sanitizeFinalResumeSections(ObjectNode structured) {
        String summary = cleanResumeLine(structured.path("professionalSummary").asText(""));
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
        int targetCount = Math.min(total, 10);
        Set<String> allowedNumbers = extractNumbers(originalResumeText);

        Map<Integer, JsonNode> aiByIndex = new HashMap<>();
        Set<Integer> selectedIndices = new LinkedHashSet<>();

        if (aiSanitizedProjects != null && aiSanitizedProjects.isArray()) {
            for (JsonNode sp : aiSanitizedProjects) {
                int idx = sp.path("originalIndex").asInt(-1);
                if (idx >= 0 && idx < total) {
                    aiByIndex.putIfAbsent(idx, sp);
                    if (selectedIndices.size() < targetCount) {
                        selectedIndices.add(idx);
                    }
                }
            }
        }

        if (selectedIndices.size() < targetCount) {
            List<Integer> remaining = new ArrayList<>();
            for (int i = 0; i < total; i++) {
                if (!selectedIndices.contains(i)) {
                    remaining.add(i);
                }
            }
            if (total > 10) {
                remaining.sort((a, b) -> Integer.compare(
                        scoreProjectRelevance(originalProjects.get(b), jd),
                        scoreProjectRelevance(originalProjects.get(a), jd)));
            }
            for (int idx : remaining) {
                if (selectedIndices.size() >= targetCount) {
                    break;
                }
                selectedIndices.add(idx);
            }
        }

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

            ArrayNode bullets = pNode.putArray("bullets");
            if (aiNode != null && aiNode.path("sanitizedBullets").isArray()) {
                for (JsonNode b : aiNode.path("sanitizedBullets")) {
                    String bText = sanitizeProjectBullet(b.asText("").trim(), origTitle);
                    if (!bText.isEmpty() && !hasInventedNumbers(bText, allowedNumbers)) {
                        bullets.add(bText);
                    }
                }
            }
            if (bullets.isEmpty() && origBullets.isArray()) {
                for (JsonNode b : origBullets) {
                    String bText = sanitizeProjectBullet(b.asText("").trim(), origTitle);
                    if (!bText.isEmpty()) {
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

