package com.atsresume.service;

import com.atsresume.dto.ResumeUpdateRequest;
import com.atsresume.model.ProcessingStatus;
import com.atsresume.model.Resume;
import com.atsresume.exception.FileStorageException;
import com.atsresume.exception.InvalidFileException;
import com.atsresume.exception.ResourceNotFoundException;
import com.atsresume.repository.ResumeRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service class implementing business logic for resume management:
 * file validation, local disk storage, text extraction via Apache Tika, and MongoDB persistence.
 */
@Service
public class ResumeService {

    private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

    /** Allowed file extensions and their expected MIME types detected by Apache Tika */
    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "pdf", "application/pdf",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    /** Maximum allowed file size in bytes (5 MB) */
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    private final ResumeRepository resumeRepository;
    private final Tika tika = new Tika();
    private final Path uploadDir;

    public ResumeService(ResumeRepository resumeRepository, @Value("${app.upload.dir:uploads}") String uploadDir) {
        this.resumeRepository = resumeRepository;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new FileStorageException("Could not initialize upload directory: " + this.uploadDir, e);
        }
    }

    /**
     * Uploads a new resume: validates file, stores it locally, extracts text with Tika, and saves metadata to MongoDB.
     */
    public Resume uploadResume(MultipartFile file) {
        String extension = validateFile(file);

        String originalName = cleanName(file.getOriginalFilename());
        String storedFileName = UUID.randomUUID() + "_" + originalName;

        Resume resume = new Resume();
        resume.setOriginalFileName(originalName);
        resume.setFileName(storedFileName);
        resume.setFileType(extension);
        resume.setFileSize(file.getSize());
        resume.setUploadDate(LocalDateTime.now());
        resume.setProcessingStatus(ProcessingStatus.PENDING);

        // Store file locally on disk
        saveFileToDisk(file, storedFileName);

        // Extract plain text using Apache Tika
        extractText(resume);

        // Save metadata and extracted text into MongoDB
        return resumeRepository.save(resume);
    }

    /**
     * Retrieves all resumes from MongoDB.
     */
    public List<Resume> getAllResumes() {
        return resumeRepository.findAll();
    }

    /**
     * Retrieves a single resume by its ID or throws ResourceNotFoundException.
     */
    public Resume getResumeById(String id) {
        return resumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found with id: " + id));
    }

    /**
     * Updates resume metadata (originalFileName or fileName) using DTO.
     */
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
        if (hasFileName) {
            resume.setFileName(cleanName(request.getFileName()));
        }

        return resumeRepository.save(resume);
    }

    /**
     * Updates a resume via multipart: can optionally replace the file and/or update file names.
     */
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
            String oldStoredFileName = resume.getFileName();
            String newOriginalName = cleanName(file.getOriginalFilename());
            String newStoredName = UUID.randomUUID() + "_" + newOriginalName;

            saveFileToDisk(file, newStoredName);

            resume.setOriginalFileName(newOriginalName);
            resume.setFileName(newStoredName);
            resume.setFileType(extension);
            resume.setFileSize(file.getSize());
            resume.setUploadDate(LocalDateTime.now());
            resume.setProcessingStatus(ProcessingStatus.PENDING);

            extractText(resume);

            // Remove previous file from disk
            deleteFileFromDisk(oldStoredFileName);
        }

        if (hasOriginal) {
            resume.setOriginalFileName(cleanName(originalFileName));
        }
        if (hasFileName) {
            resume.setFileName(cleanName(fileName));
        }

        return resumeRepository.save(resume);
    }

    /**
     * Deletes a resume from MongoDB and removes its stored file from local disk.
     */
    public void deleteResume(String id) {
        Resume resume = getResumeById(id);
        resumeRepository.delete(resume);
        deleteFileFromDisk(resume.getFileName());
    }

    // ---------- Helper Methods ----------

    /**
     * Validates that the file is not empty, does not exceed size limit, has an allowed extension,
     * and that the actual file content matches the extension using Apache Tika.
     */
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

        // Validate content MIME type via Apache Tika to detect spoofed/corrupted extensions
        try (InputStream in = file.getInputStream()) {
            String detectedMime = tika.detect(in);
            if (!ALLOWED_TYPES.get(extension).equals(detectedMime)) {
                throw new InvalidFileException("File content does not match its ." + extension + " extension");
            }
        } catch (IOException e) {
            throw new FileStorageException("Could not read uploaded file for validation", e);
        }

        return extension;
    }

    /**
     * Prevents path traversal attacks by extracting only the base file name.
     */
    private String cleanName(String name) {
        if (name == null || name.isBlank()) {
            return "resume";
        }
        String cleaned = name.replace('\\', '/');
        int lastSlash = cleaned.lastIndexOf('/');
        return (lastSlash >= 0) ? cleaned.substring(lastSlash + 1) : cleaned;
    }

    /**
     * Stores the multipart file to local disk storage.
     */
    private void saveFileToDisk(MultipartFile file, String storedFileName) {
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, uploadDir.resolve(storedFileName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new FileStorageException("Failed to store file on disk: " + storedFileName, e);
        }
    }

    /**
     * Deletes a stored file from local disk.
     */
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

    /**
     * Extracts text using Apache Tika. If file is corrupted or unreadable, marks status as FAILED.
     */
    private void extractText(Resume resume) {
        try {
            String text = tika.parseToString(uploadDir.resolve(resume.getFileName()));
            resume.setExtractedText((text != null) ? text.trim() : "");
            resume.setProcessingStatus(ProcessingStatus.COMPLETED);
        } catch (Exception e) {
            log.error("Text extraction failed for resume file {}: {}", resume.getFileName(), e.getMessage());
            resume.setExtractedText(null);
            resume.setProcessingStatus(ProcessingStatus.FAILED);
        }
    }
}
