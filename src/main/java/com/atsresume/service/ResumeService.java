package com.atsresume.service;

import com.atsresume.entity.ProcessingStatus;
import com.atsresume.entity.Resume;
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

/** Business logic for resumes: validation, local file storage, Tika text extraction, CRUD. */
@Service
public class ResumeService {

    private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

    /** Allowed file types: extension -> MIME type that Tika must detect from the real content. */
    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "pdf", "application/pdf",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    private final ResumeRepository resumeRepository;
    private final Tika tika = new Tika();
    private final Path uploadDir;

    public ResumeService(ResumeRepository resumeRepository, @Value("${app.upload.dir}") String uploadDir) {
        this.resumeRepository = resumeRepository;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new FileStorageException("Could not create upload directory " + this.uploadDir, e);
        }
    }

    /** Validates, stores and processes a new resume file. */
    public Resume uploadResume(MultipartFile file) {
        String extension = validate(file);
        String storedName = UUID.randomUUID() + "." + extension;

        Resume resume = new Resume();
        resume.setFileName(cleanName(file.getOriginalFilename()));
        resume.setStoredFileName(storedName);
        resume.setFileType(extension);
        resume.setFileSize(file.getSize());
        resume.setUploadDate(LocalDateTime.now());
        resume.setProcessingStatus(ProcessingStatus.PENDING);

        saveToDisk(file, storedName);
        extractText(resume);
        return resumeRepository.save(resume);
    }

    public List<Resume> getAllResumes() {
        return resumeRepository.findAll();
    }

    public Resume getResumeById(String id) {
        return resumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found with id: " + id));
    }

    /**
     * Updates a resume. Optionally renames it (newFileName) and/or replaces the file.
     * At least one of the two must be provided.
     */
    public Resume updateResume(String id, String newFileName, MultipartFile newFile) {
        Resume resume = getResumeById(id);
        boolean hasName = newFileName != null && !newFileName.isBlank();
        boolean hasFile = newFile != null && !newFile.isEmpty();
        if (!hasName && !hasFile) {
            throw new InvalidFileException("Provide a new 'file' and/or 'fileName' to update");
        }

        if (hasFile) {
            String extension = validate(newFile);
            String oldStoredName = resume.getStoredFileName();
            String storedName = UUID.randomUUID() + "." + extension;
            saveToDisk(newFile, storedName);

            resume.setStoredFileName(storedName);
            resume.setFileType(extension);
            resume.setFileSize(newFile.getSize());
            resume.setFileName(cleanName(newFile.getOriginalFilename()));
            resume.setUploadDate(LocalDateTime.now());
            resume.setProcessingStatus(ProcessingStatus.PENDING);
            extractText(resume);
            deleteFromDisk(oldStoredName); // remove the replaced file
        }
        if (hasName) {
            resume.setFileName(cleanName(newFileName));
        }
        return resumeRepository.save(resume);
    }

    /** Deletes the database record and the stored file. */
    public void deleteResume(String id) {
        Resume resume = getResumeById(id);
        resumeRepository.delete(resume);
        deleteFromDisk(resume.getStoredFileName());
    }

    // ---------- helpers ----------

    /** Checks empty file, extension, and real content type (not just the name). Returns extension. */
    private String validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("File is empty or missing");
        }
        String name = cleanName(file.getOriginalFilename());
        int dot = name.lastIndexOf('.');
        String extension = dot < 0 ? "" : name.substring(dot + 1).toLowerCase();
        if (!ALLOWED_TYPES.containsKey(extension)) {
            throw new InvalidFileException("Only PDF and DOCX files are allowed");
        }
        try (InputStream in = file.getInputStream()) {
            String detected = tika.detect(in);
            if (!ALLOWED_TYPES.get(extension).equals(detected)) {
                throw new InvalidFileException("File content does not match its ." + extension + " extension");
            }
        } catch (IOException e) {
            throw new FileStorageException("Could not read uploaded file", e);
        }
        return extension;
    }

    /** Strips any path parts from the client-supplied name (prevents path traversal). */
    private String cleanName(String name) {
        if (name == null || name.isBlank()) {
            return "resume";
        }
        String cleaned = name.replace('\\', '/');
        return cleaned.substring(cleaned.lastIndexOf('/') + 1);
    }

    private void saveToDisk(MultipartFile file, String storedName) {
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, uploadDir.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new FileStorageException("Could not store file " + storedName, e);
        }
    }

    private void deleteFromDisk(String storedName) {
        try {
            Files.deleteIfExists(uploadDir.resolve(storedName));
        } catch (IOException e) {
            // DB state is already correct; just log the leftover file.
            log.warn("Could not delete file {}", storedName, e);
        }
    }

    /** Runs Tika on the stored file and sets extractedText + status (COMPLETED or FAILED). */
    private void extractText(Resume resume) {
        try {
            String text = tika.parseToString(uploadDir.resolve(resume.getStoredFileName()));
            resume.setExtractedText(text.trim());
            resume.setProcessingStatus(ProcessingStatus.COMPLETED);
        } catch (Exception e) {
            log.error("Text extraction failed for {}", resume.getFileName(), e);
            resume.setExtractedText(null);
            resume.setProcessingStatus(ProcessingStatus.FAILED);
        }
    }
}
