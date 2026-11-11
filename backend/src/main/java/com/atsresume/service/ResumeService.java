package com.atsresume.service;

import com.atsresume.dto.ResumeUpdateRequest;
import com.atsresume.exception.FileStorageException;
import com.atsresume.exception.InvalidFileException;
import com.atsresume.exception.ResourceNotFoundException;
import com.atsresume.model.ProcessingStatus;
import com.atsresume.model.Resume;
import com.atsresume.repository.ResumeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ResumeService {

    private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "pdf", "application/pdf",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    private final ResumeRepository resumeRepository;
    private final ResumeParsingService parsingService;
    private final ResumeAnalysisService analysisService;
    private final ResumeOptimizationService optimizationService;
    private final Path uploadDir;

    public ResumeService(
            ResumeRepository resumeRepository,
            ResumeParsingService parsingService,
            ResumeAnalysisService analysisService,
            ResumeOptimizationService optimizationService,
            @Value("${app.upload.dir:uploads}") String uploadDir) {
        this.resumeRepository = resumeRepository;
        this.parsingService = parsingService;
        this.analysisService = analysisService;
        this.optimizationService = optimizationService;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new FileStorageException("Could not initialize upload directory: " + this.uploadDir, e);
        }
    }

    public Resume uploadResume(MultipartFile file) {
        String extension = validateFile(file);

        String originalName = cleanName(file.getOriginalFilename());
        String storedFileName = UUID.randomUUID() + "." + extension;

        Resume resume = new Resume();
        resume.setOriginalFileName(originalName);
        resume.setFileName(originalName);
        resume.setStorageFileName(storedFileName);
        resume.setFileType(extension);
        resume.setFileSize(file.getSize());
        resume.setUploadDate(LocalDateTime.now());
        resume.setProcessingStatus(ProcessingStatus.PENDING);

        saveFileToDisk(file, storedFileName);
        parsingService.extractText(resume, uploadDir.resolve(storageName(resume)));
        parsingService.parseStructured(resume);

        try {
            return resumeRepository.save(resume);
        } catch (RuntimeException e) {
            deleteFileFromDisk(storedFileName);
            throw e;
        }
    }

    public List<Resume> getAllResumes() {
        return resumeRepository.findAll();
    }

    public Resume getResumeById(String id) {
        return resumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found with id: " + id));
    }

    public Resume updateResumeMetadata(String id, ResumeUpdateRequest request) {
        Resume resume = getResumeById(id);

        boolean hasOriginal = request != null && request.getOriginalFileName() != null && !request.getOriginalFileName().isBlank();
        boolean hasFileName = request != null && request.getFileName() != null && !request.getFileName().isBlank();

        if (!hasOriginal && !hasFileName) {
            throw new InvalidFileException("Provide at least one field to update (originalFileName or fileName)");
        }

        if (hasOriginal) {
            resume.setOriginalFileName(cleanName(request.getOriginalFileName()));
        }
        resume.setStorageFileName(storageName(resume));
        if (hasFileName) {
            resume.setFileName(cleanName(request.getFileName()));
        }

        return resumeRepository.save(resume);
    }

    public Resume updateResume(String id, String fileName, String originalFileName, MultipartFile file) {
        Resume resume = getResumeById(id);

        boolean hasFile = file != null && !file.isEmpty();
        boolean hasFileName = fileName != null && !fileName.isBlank();
        boolean hasOriginal = originalFileName != null && !originalFileName.isBlank();

        if (!hasFile && !hasFileName && !hasOriginal) {
            throw new InvalidFileException("Provide a new 'file', 'fileName', or 'originalFileName' to update");
        }

        if (hasFile) {
            String extension = validateFile(file);
            String oldStoredFileName = storageName(resume);
            String newOriginalName = cleanName(file.getOriginalFilename());
            String newStoredName = UUID.randomUUID() + "." + extension;

            saveFileToDisk(file, newStoredName);

            resume.setOriginalFileName(newOriginalName);
            resume.setFileName(newOriginalName);
            resume.setStorageFileName(newStoredName);
            resume.setFileType(extension);
            resume.setFileSize(file.getSize());
            resume.setUploadDate(LocalDateTime.now());
            resume.setProcessingStatus(ProcessingStatus.PENDING);

            if (hasOriginal) {
                resume.setOriginalFileName(cleanName(originalFileName));
            }
            if (hasFileName) {
                resume.setFileName(cleanName(fileName));
            }

            parsingService.extractText(resume, uploadDir.resolve(storageName(resume)));
            parsingService.parseStructured(resume);

            try {
                Resume savedResume = resumeRepository.save(resume);
                deleteFileFromDisk(oldStoredFileName);
                return savedResume;
            } catch (RuntimeException e) {
                deleteFileFromDisk(newStoredName);
                throw e;
            }
        }

        if (hasOriginal) {
            resume.setOriginalFileName(cleanName(originalFileName));
        }
        resume.setStorageFileName(storageName(resume));
        if (hasFileName) {
            resume.setFileName(cleanName(fileName));
        }

        return resumeRepository.save(resume);
    }

    public String extractPlainText(MultipartFile file) {
        validateFile(file);
        return parsingService.extractPlainText(file);
    }

    public Resume reparse(String id) {
        Resume resume = getResumeById(id);
        parsingService.parseStructured(resume);
        return resumeRepository.save(resume);
    }

    public JsonNode saveStructured(String id, JsonNode structured) {
        Resume resume = getResumeById(id);
        if (structured == null || !structured.isObject()) {
            throw new InvalidFileException("Structured resume body must be a JSON object");
        }
        ObjectNode normalized = parsingService.normalizeStructured(structured, resume.getExtractedText());
        resume.setStructuredResume(parsingService.toMap(normalized));
        resume.setTotalExperienceMonths(parsingService.calculateExperienceMonths(normalized));
        resumeRepository.save(resume);
        return normalized;
    }

    public JsonNode analyze(String id, JsonNode request) {
        Resume resume = getResumeById(id);
        String jd = request == null ? "" : request.path("jobDescription").asText("").trim();
        if (jd.length() < 20) {
            throw new InvalidFileException("jobDescription must contain at least 20 characters");
        }
        String rawText = resume.getExtractedText() == null ? "" : resume.getExtractedText().toLowerCase();
        boolean hasProjectSection = rawText.contains("projects") || rawText.contains("project details") || rawText.contains("project 1");
        if (resume.getStructuredResume() == null
                || resume.getStructuredResume().isEmpty()
                || (hasProjectSection && parsingService.toJsonNode(resume.getStructuredResume()).path("projects").isEmpty())) {
            parsingService.parseStructured(resume);
        }

        String jobTitle = request.path("jobTitle").asText("").trim();
        String companyName = request.path("companyName").asText("").trim();
        JsonNode structured = parsingService.toJsonNode(resume.getStructuredResume());
        int totalMonths = parsingService.calculateExperienceMonths(structured);
        resume.setTotalExperienceMonths(totalMonths);

        ObjectNode analysis = analysisService.analyzeResume(resume, structured, jobTitle, companyName, jd, totalMonths);
        resume.setStructuredResume(parsingService.toMap(structured));
        resume.setLastAnalysis(parsingService.toMap(analysis));
        resumeRepository.save(resume);
        return analysis;
    }

    public JsonNode optimize(String id, JsonNode request) {
        Resume resume = getResumeById(id);
        String rawText = resume.getExtractedText() == null ? "" : resume.getExtractedText().toLowerCase();
        boolean hasProjectSection = rawText.contains("projects") || rawText.contains("project details") || rawText.contains("project 1");
        if (resume.getStructuredResume() == null
                || resume.getStructuredResume().isEmpty()
                || (hasProjectSection && parsingService.toJsonNode(resume.getStructuredResume()).path("projects").isEmpty())) {
            parsingService.parseStructured(resume);
        }

        ObjectNode structured = (ObjectNode) parsingService.toJsonNode(resume.getStructuredResume());
        Set<String> approvedIds = new HashSet<>();
        if (request != null && request.path("approvedSuggestionIds").isArray()) {
            request.path("approvedSuggestionIds").forEach(n -> approvedIds.add(n.asText()));
        }

        if (resume.getLastAnalysis() != null && !approvedIds.isEmpty()) {
            JsonNode lastAnalysisNode = parsingService.toJsonNode(resume.getLastAnalysis());
            JsonNode suggestions = lastAnalysisNode.path("suggestions");
            String jd = (request != null && !request.path("jobDescription").asText("").isBlank())
                    ? request.path("jobDescription").asText("").trim()
                    : lastAnalysisNode.path("jobDescription").asText("").trim();
            optimizationService.applyApprovedSuggestions(structured, suggestions, approvedIds, jd, resume.getExtractedText());
        }

        resume.setStructuredResume(parsingService.toMap(structured));
        resume.setTotalExperienceMonths(parsingService.calculateExperienceMonths(structured));
        resumeRepository.save(resume);
        return structured;
    }

    public void deleteResume(String id) {
        Resume resume = getResumeById(id);
        resumeRepository.delete(resume);
        deleteFileFromDisk(storageName(resume));
    }

    private String validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("File is empty or missing");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new InvalidFileException("File size exceeds maximum limit of 5MB");
        }

        String originalName = cleanName(file.getOriginalFilename());
        int dotIndex = originalName.lastIndexOf('.');
        String extension = (dotIndex < 0) ? "" : originalName.substring(dotIndex + 1).toLowerCase();

        if (!ALLOWED_TYPES.containsKey(extension)) {
            throw new InvalidFileException("Only PDF and DOCX files are allowed");
        }

        try {
            String detectedMime = parsingService.detectMimeType(file);
            if (!ALLOWED_TYPES.get(extension).equals(detectedMime)) {
                throw new InvalidFileException("File content does not match its ." + extension + " extension");
            }
        } catch (IOException e) {
            throw new FileStorageException("Could not read uploaded file for validation", e);
        }

        return extension;
    }

    private String cleanName(String name) {
        if (name == null || name.isBlank()) {
            return "resume";
        }
        String cleaned = name.replace('\\', '/');
        int lastSlash = cleaned.lastIndexOf('/');
        String baseName = (lastSlash >= 0) ? cleaned.substring(lastSlash + 1) : cleaned;
        baseName = baseName.trim();
        return (baseName.isBlank() || ".".equals(baseName) || "..".equals(baseName)) ? "resume" : baseName;
    }

    private String storageName(Resume resume) {
        String storageFileName = resume.getStorageFileName();
        if (storageFileName == null || storageFileName.isBlank()) {
            storageFileName = resume.getFileName();
        }
        return (storageFileName == null || storageFileName.isBlank()) ? null : cleanName(storageFileName);
    }

    private void saveFileToDisk(MultipartFile file, String storedFileName) {
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, uploadDir.resolve(storedFileName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new FileStorageException("Failed to store file on disk: " + storedFileName, e);
        }
    }

    private void deleteFileFromDisk(String storedFileName) {
        if (storedFileName == null || storedFileName.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(uploadDir.resolve(storedFileName));
        } catch (IOException e) {
            log.warn("Could not delete stored file: {}", storedFileName, e);
        }
    }
}
