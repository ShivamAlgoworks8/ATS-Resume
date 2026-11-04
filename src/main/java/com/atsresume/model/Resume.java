package com.atsresume.model;

import java.time.LocalDateTime;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Model: represents a resume stored in the "resumes" MongoDB collection.
 * Holds resume metadata, local storage reference, and extracted plain text.
 */
@Document(collection = "resumes")
public class Resume {

    /** Unique MongoDB document identifier */
    @Id
    private String id;

    /** Original name of the uploaded file (e.g. "my_resume.pdf") */
    private String originalFileName;

    /** Stored unique file name on disk (e.g. "uuid_my_resume.pdf") */
    private String fileName;

    /** File extension / format: "pdf" or "docx" */
    private String fileType;

    /** File size in bytes */
    private long fileSize;

    /** Plain text extracted from the document using Apache Tika */
    private String extractedText;

    /** Timestamp when the resume was uploaded or updated */
    private LocalDateTime uploadDate;

    /** Processing status: PENDING, COMPLETED, or FAILED */
    private ProcessingStatus processingStatus;

    public Resume() {
    }

    public Resume(String originalFileName, String fileName, String fileType, long fileSize,
                  String extractedText, LocalDateTime uploadDate, ProcessingStatus processingStatus) {
        this.originalFileName = originalFileName;
        this.fileName = fileName;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.extractedText = extractedText;
        this.uploadDate = uploadDate;
        this.processingStatus = processingStatus;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }

    public String getExtractedText() {
        return extractedText;
    }

    public void setExtractedText(String extractedText) {
        this.extractedText = extractedText;
    }

    public LocalDateTime getUploadDate() {
        return uploadDate;
    }

    public void setUploadDate(LocalDateTime uploadDate) {
        this.uploadDate = uploadDate;
    }

    public ProcessingStatus getProcessingStatus() {
        return processingStatus;
    }

    public void setProcessingStatus(ProcessingStatus processingStatus) {
        this.processingStatus = processingStatus;
    }
}
