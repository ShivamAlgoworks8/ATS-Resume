package com.atsresume.service;

import com.atsresume.exception.InvalidFileException;
import com.atsresume.model.ProcessingStatus;
import com.atsresume.model.Resume;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Duration;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ResumeParsingService {

    private static final Logger log = LoggerFactory.getLogger(ResumeParsingService.class);
    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    private static final Pattern MONTH_YEAR = Pattern.compile(
            "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?,?\\s*'?(\\d{2,4})",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern SLASH_DATE = Pattern.compile("(\\d{1,2})/(\\d{4})");
    private static final Pattern YEAR_ONLY = Pattern.compile("\\b((?:19|20)\\d{2})\\b");

    private final Tika tika = new Tika();
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private final String groqApiKey;
    private final String groqModel;

    public ResumeParsingService(
            @Value("${groq.api.key:}") String groqApiKey,
            @Value("${groq.model:openai/gpt-oss-20b}") String groqModel) {
        this.groqApiKey = groqApiKey == null ? "" : groqApiKey.trim();
        this.groqModel = (groqModel == null || groqModel.isBlank()) ? "openai/gpt-oss-20b" : groqModel.trim();
    }

    public String detectMimeType(MultipartFile file) throws IOException {
        try (InputStream in = file.getInputStream()) {
            return tika.detect(in);
        }
    }

    public String extractPlainText(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            String text = tika.parseToString(in);
            return text == null ? "" : text.trim();
        } catch (Exception e) {
            throw new InvalidFileException("Could not read text from the uploaded file");
        }
    }

    public void extractText(Resume resume, Path filePath) {
        try {
            String text = tika.parseToString(filePath);
            resume.setExtractedText((text != null) ? text.trim() : "");
            resume.setProcessingStatus(ProcessingStatus.COMPLETED);
        } catch (Exception e) {
            log.error("Text extraction failed for resume file {}: {}", resume.getFileName(), e.getMessage());
            resume.setExtractedText(null);
            resume.setProcessingStatus(ProcessingStatus.FAILED);
        }
    }

    public void parseStructured(Resume resume) {
        String rawText = resume.getExtractedText();
        if (rawText == null || rawText.isBlank()) {
            return;
        }
        String cleanedText = cleanResumeText(rawText);

        String systemPrompt = """
                You are an accurate ATS resume parser. Extract the candidate's resume into strict JSON.
                Rules:
                1. Extract ONLY facts present in the resume text. Never invent companies, roles, projects, skills, dates, or metrics.
                2. Separate work/internship roles into "experience" and explicitly mentioned projects into "projects".
                3. Extract ALL projects that are explicitly mentioned in the resume (e.g. under PROJECTS, Project Details, SELECTED ENTERPRISE PROJECTS, ADDITIONAL PROJECTS, Key Projects, or labeled as a Project). If no projects are mentioned in the resume, return an empty array [] for "projects". Never create projects on your own from regular work experience.
                4. Extract ALL work experience entries with their exact startDate and endDate strings (e.g. "Jan 2022", "Present", "Nov 2020").
                5. Extract ALL education entries and ALL certifications/awards/achievements.
                Return ONLY a JSON object with this exact structure:
                {
                  "contact": {
                    "fullName": "",
                    "email": "",
                    "phone": "",
                    "location": "",
                    "linkedin": "",
                    "github": "",
                    "portfolio": ""
                  },
                  "professionalSummary": "",
                  "skillCategories": [
                    { "id": "cat-1", "categoryName": "", "skills": [""] }
                  ],
                  "experience": [
                    {
                      "id": "exp-1",
                      "company": "",
                      "jobTitle": "",
                      "location": "",
                      "startDate": "",
                      "endDate": "",
                      "bullets": [""]
                    }
                  ],
                  "projects": [
                    {
                      "id": "proj-1",
                      "title": "",
                      "technologies": "",
                      "link": "",
                      "startDate": "",
                      "endDate": "",
                      "bullets": [""]
                    }
                  ],
                  "education": [
                    {
                      "id": "edu-1",
                      "institution": "",
                      "degree": "",
                      "fieldOfStudy": "",
                      "location": "",
                      "startDate": "",
                      "endDate": "",
                      "gradeOrHonors": ""
                    }
                  ],
                  "achievements": [
                    {
                      "id": "ach-1",
                      "title": "",
                      "issuerOrContext": "",
                      "date": "",
                      "description": ""
                    }
                  ]
                }
                """;

        String userPrompt = "File name: " + resume.getOriginalFileName() + "\n\nResume text:\n" + cleanedText;
        JsonNode aiNode = callGroqJson(systemPrompt, userPrompt);

        if (aiNode != null && aiNode.isObject()) {
            ObjectNode normalized = normalizeStructured(aiNode, cleanedText);
            resume.setStructuredResume(toMap(normalized));
            resume.setParsingMethod("GROQ");
            resume.setTotalExperienceMonths(calculateExperienceMonths(normalized));
        } else {
            ObjectNode fallback = buildEmptyStructured(resume.getOriginalFileName(), cleanedText);
            resume.setStructuredResume(toMap(fallback));
            resume.setParsingMethod("FALLBACK");
            resume.setTotalExperienceMonths(0);
        }
    }

    public JsonNode callGroqJson(String systemPrompt, String userPrompt) {
        if (groqApiKey.isEmpty()) {
            log.warn("GROQ_API_KEY is not configured in backend/.env");
            return null;
        }
        Set<String> modelsToTry = new LinkedHashSet<>(List.of(groqModel, "openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"));
        for (String model : modelsToTry) {
            try {
                ObjectNode payload = mapper.createObjectNode();
                payload.put("model", model);
                payload.put("temperature", 0.1);
                payload.put("max_tokens", 4096);
                payload.putObject("response_format").put("type", "json_object");

                ArrayNode messages = payload.putArray("messages");
                messages.addObject().put("role", "system").put("content", systemPrompt);
                messages.addObject().put("role", "user").put("content", userPrompt);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(GROQ_URL))
                        .timeout(Duration.ofSeconds(45))
                        .header("Authorization", "Bearer " + groqApiKey)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload)))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 429) {
                    log.warn("Groq rate limit (429) on model {}, trying next model", model);
                    continue;
                }
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    log.error("Groq API returned HTTP {} on model {}: {}", response.statusCode(), model, response.body());
                    continue;
                }

                JsonNode root = mapper.readTree(response.body());
                String content = root.path("choices").path(0).path("message").path("content").asText("");
                if (!content.isBlank()) {
                    return mapper.readTree(content);
                }
            } catch (Exception e) {
                log.error("Error calling Groq API with model {}: {}", model, e.getMessage());
            }
        }
        return null;
    }

    public ObjectNode normalizeStructured(JsonNode input, String sourceText) {
        ObjectNode root = mapper.createObjectNode();

        JsonNode cIn = input.path("contact");
        ObjectNode contact = root.putObject("contact");
        contact.put("fullName", cIn.path("fullName").asText("").trim());
        contact.put("email", cIn.path("email").asText("").trim());
        contact.put("phone", cIn.path("phone").asText("").trim());
        contact.put("location", cIn.path("location").asText("").trim());
        contact.put("linkedin", cIn.path("linkedin").asText("").trim());
        contact.put("github", cIn.path("github").asText("").trim());
        contact.put("portfolio", cIn.path("portfolio").asText("").trim());

        root.put("professionalSummary", input.path("professionalSummary").asText("").trim());

        ArrayNode skillCats = root.putArray("skillCategories");
        int catIdx = 1;
        if (input.path("skillCategories").isArray()) {
            for (JsonNode cat : input.path("skillCategories")) {
                ArrayNode skills = mapper.createArrayNode();
                for (JsonNode s : cat.path("skills")) {
                    String val = s.asText("").trim();
                    if (!val.isEmpty() && appearsInText(val, sourceText)) {
                        skills.add(val);
                    }
                }
                if (!skills.isEmpty()) {
                    ObjectNode cNode = skillCats.addObject();
                    cNode.put("id", "cat-" + catIdx++);
                    cNode.put("categoryName", cat.path("categoryName").asText("Technical Skills").trim());
                    cNode.set("skills", skills);
                }
            }
        }

        ArrayNode expArr = root.putArray("experience");
        int expIdx = 1;
        if (input.path("experience").isArray()) {
            for (JsonNode exp : input.path("experience")) {
                String company = exp.path("company").asText("").trim();
                String jobTitle = exp.path("jobTitle").asText("").trim();
                if (company.isEmpty() && jobTitle.isEmpty()) {
                    continue;
                }
                if (!appearsInText(company, sourceText) && !appearsInText(jobTitle, sourceText)) {
                    continue;
                }
                ObjectNode eNode = expArr.addObject();
                eNode.put("id", "exp-" + expIdx++);
                eNode.put("company", company);
                eNode.put("jobTitle", jobTitle);
                eNode.put("location", exp.path("location").asText("").trim());
                eNode.put("startDate", exp.path("startDate").asText("").trim());
                eNode.put("endDate", exp.path("endDate").asText("").trim());
                ArrayNode bullets = eNode.putArray("bullets");
                for (JsonNode b : exp.path("bullets")) {
                    String bText = b.asText("").trim();
                    if (!bText.isEmpty()) {
                        bullets.add(bText);
                    }
                }
            }
        }

        ArrayNode projArr = root.putArray("projects");
        int projIdx = 1;
        if (input.path("projects").isArray()) {
            for (JsonNode proj : input.path("projects")) {
                String title = proj.path("title").asText(proj.path("name").asText("")).trim();
                if (title.isEmpty()) {
                    continue;
                }
                ArrayNode bullets = mapper.createArrayNode();
                if (proj.path("bullets").isArray()) {
                    for (JsonNode b : proj.path("bullets")) {
                        String bText = b.asText("").trim();
                        if (!bText.isEmpty()) {
                            bullets.add(bText);
                        }
                    }
                }
                if (bullets.isEmpty() && !proj.path("description").asText("").isBlank()) {
                    for (String sentence : proj.path("description").asText().trim().split("(?<=\\.)\\s+")) {
                        if (!sentence.isBlank()) {
                            bullets.add(sentence.trim());
                        }
                    }
                }
                String tech = proj.path("technologies").asText(proj.path("domain").asText("")).trim();
                if (!appearsInText(title, sourceText)) {
                    continue;
                }
                ObjectNode pNode = projArr.addObject();
                pNode.put("id", "proj-" + projIdx++);
                pNode.put("title", title);
                pNode.put("originalTitle", title);
                pNode.put("technologies", tech);
                pNode.put("link", proj.path("link").asText("").trim());
                pNode.put("startDate", proj.path("startDate").asText("").trim());
                pNode.put("endDate", proj.path("endDate").asText("").trim());
                pNode.set("bullets", bullets);
                pNode.set("originalBullets", bullets.deepCopy());
            }
        }
        if (input.path("originalProjects").isArray() && !input.path("originalProjects").isEmpty()) {
            root.set("originalProjects", input.path("originalProjects").deepCopy());
        } else {
            root.set("originalProjects", projArr.deepCopy());
        }

        ArrayNode eduArr = root.putArray("education");
        int eduIdx = 1;
        if (input.path("education").isArray()) {
            for (JsonNode edu : input.path("education")) {
                String institution = edu.path("institution").asText("").trim();
                String degree = edu.path("degree").asText("").trim();
                if (institution.isEmpty() && degree.isEmpty()) {
                    continue;
                }
                ObjectNode edNode = eduArr.addObject();
                edNode.put("id", "edu-" + eduIdx++);
                edNode.put("institution", institution);
                edNode.put("degree", degree);
                edNode.put("fieldOfStudy", edu.path("fieldOfStudy").asText("").trim());
                edNode.put("location", edu.path("location").asText("").trim());
                edNode.put("startDate", edu.path("startDate").asText("").trim());
                edNode.put("endDate", edu.path("endDate").asText("").trim());
                edNode.put("gradeOrHonors", edu.path("gradeOrHonors").asText("").trim());
            }
        }

        ArrayNode achArr = root.putArray("achievements");
        int achIdx = 1;
        if (input.path("achievements").isArray()) {
            for (JsonNode ach : input.path("achievements")) {
                String title = ach.path("title").asText("").trim();
                if (title.isEmpty()) {
                    continue;
                }
                ObjectNode aNode = achArr.addObject();
                aNode.put("id", "ach-" + achIdx++);
                aNode.put("title", title);
                aNode.put("issuerOrContext", ach.path("issuerOrContext").asText("").trim());
                aNode.put("date", ach.path("date").asText("").trim());
                aNode.put("description", ach.path("description").asText("").trim());
            }
        }

        return root;
    }

    public int calculateExperienceMonths(JsonNode structured) {
        if (structured == null || !structured.path("experience").isArray()) {
            return 0;
        }
        List<YearMonth[]> intervals = new ArrayList<>();
        for (JsonNode exp : structured.path("experience")) {
            YearMonth start = parseYearMonth(exp.path("startDate").asText(""), false);
            YearMonth end = parseYearMonth(exp.path("endDate").asText(""), true);
            if (start != null && end != null && !end.isBefore(start)) {
                intervals.add(new YearMonth[]{start, end});
            }
        }
        if (intervals.isEmpty()) {
            return 0;
        }
        intervals.sort((a, b) -> a[0].compareTo(b[0]));

        int total = 0;
        YearMonth curStart = intervals.get(0)[0];
        YearMonth curEnd = intervals.get(0)[1];

        for (int i = 1; i < intervals.size(); i++) {
            YearMonth nextStart = intervals.get(i)[0];
            YearMonth nextEnd = intervals.get(i)[1];
            if (!nextStart.isAfter(curEnd.plusMonths(1))) {
                if (nextEnd.isAfter(curEnd)) {
                    curEnd = nextEnd;
                }
            } else {
                total += (int) curStart.until(curEnd, ChronoUnit.MONTHS) + 1;
                curStart = nextStart;
                curEnd = nextEnd;
            }
        }
        total += (int) curStart.until(curEnd, ChronoUnit.MONTHS) + 1;
        return total;
    }

    public boolean appearsInText(String candidate, String sourceText) {
        if (candidate == null || candidate.isBlank() || sourceText == null || sourceText.isBlank()) {
            return true;
        }
        String normSource = sourceText.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ");
        String normCand = candidate.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
        if (normCand.isEmpty() || normSource.contains(normCand)) {
            return true;
        }
        String[] tokens = normCand.split("\\s+");
        int matched = 0;
        for (String tok : tokens) {
            if (tok.length() >= 2 && normSource.contains(tok)) {
                matched++;
            }
        }
        return tokens.length > 0 && matched >= Math.ceil(tokens.length * 0.6);
    }

    public JsonNode toJsonNode(Object value) {
        return mapper.valueToTree(value);
    }

    public ObjectNode createObjectNode() {
        return mapper.createObjectNode();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> toMap(JsonNode node) {
        return mapper.convertValue(node, Map.class);
    }

    private ObjectNode buildEmptyStructured(String fileName, String rawText) {
        ObjectNode root = mapper.createObjectNode();
        ObjectNode contact = root.putObject("contact");
        contact.put("fullName", fileName == null ? "" : fileName.replaceAll("(?i)\\.(pdf|docx)$", ""));
        contact.put("email", "");
        contact.put("phone", "");
        contact.put("location", "");
        contact.put("linkedin", "");
        contact.put("github", "");
        contact.put("portfolio", "");
        root.put("professionalSummary", rawText.length() > 400 ? rawText.substring(0, 400) : rawText);
        root.putArray("skillCategories");
        root.putArray("experience");
        root.putArray("projects");
        root.putArray("education");
        root.putArray("achievements");
        return root;
    }

    private YearMonth parseYearMonth(String text, boolean isEnd) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String t = text.trim().toLowerCase(Locale.ROOT);
        YearMonth now = YearMonth.now();
        if (t.matches(".*\\b(present|current|now|till date|ongoing|today)\\b.*")) {
            return now;
        }
        Matcher m = MONTH_YEAR.matcher(t);
        if (m.find()) {
            int month = monthNumber(m.group(1));
            int year = Integer.parseInt(m.group(2));
            if (year < 100) {
                year += 2000;
            }
            return YearMonth.of(year, month);
        }
        m = SLASH_DATE.matcher(t);
        if (m.find()) {
            int month = Integer.parseInt(m.group(1));
            int year = Integer.parseInt(m.group(2));
            if (month >= 1 && month <= 12) {
                return YearMonth.of(year, month);
            }
        }
        m = YEAR_ONLY.matcher(t);
        if (m.find()) {
            int year = Integer.parseInt(m.group(1));
            YearMonth ym = YearMonth.of(year, isEnd ? 12 : 1);
            return (isEnd && ym.isAfter(now)) ? now : ym;
        }
        return null;
    }

    private int monthNumber(String prefix) {
        String[] months = {"jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"};
        String p = prefix.substring(0, 3).toLowerCase(Locale.ROOT);
        for (int i = 0; i < months.length; i++) {
            if (months[i].equals(p)) {
                return i + 1;
            }
        }
        return 1;
    }

    private String cleanResumeText(String rawText) {
        String text = rawText.replace("\u00a0", " ");
        List<String> lines = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        boolean inDuplicateTabTrailer = false;

        for (String rawLine : text.split("\\r?\\n")) {
            boolean startsWithTab = rawLine.startsWith("\t");
            String pre = rawLine.replace("\t", " ").replaceAll("(?<=\\b[a-z])(?=[A-Z])", "  ");
            String s = pre.replaceAll("\\s+", " ").trim();

            if (pre.matches(".*(?<![A-Za-z0-9])([A-Za-z0-9])(?: ([A-Za-z0-9])){2,}(?![A-Za-z0-9]).*")) {
                StringBuilder sb = new StringBuilder();
                for (String word : pre.trim().split("\\s{2,}")) {
                    if (sb.length() > 0) {
                        sb.append(' ');
                    }
                    if (word.matches("([A-Za-z0-9] )+[A-Za-z0-9].*")) {
                        sb.append(word.replaceAll("(?<=[A-Za-z0-9]) (?=[A-Za-z0-9]\\b)", ""));
                    } else {
                        sb.append(word);
                    }
                }
                s = sb.toString().replaceAll("\\s+", " ").trim();
            }
            s = s.replaceAll("(?i)\\b(Present|Current)\\s*(?=[A-Z][A-Za-z])", "$1 | ");

            if (s.isEmpty()) {
                continue;
            }
            if (startsWithTab && lines.size() > 15 && (inDuplicateTabTrailer || seen.contains(s.toLowerCase(Locale.ROOT)))) {
                inDuplicateTabTrailer = true;
                continue;
            }
            if (!startsWithTab) {
                inDuplicateTabTrailer = false;
            }
            lines.add(s);
            seen.add(s.toLowerCase(Locale.ROOT));
        }
        return String.join("\n", lines);
    }
}

