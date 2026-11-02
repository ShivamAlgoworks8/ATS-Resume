package com.atsresume.entity;

import java.time.LocalDateTime;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Entity: a resume stored in the "resumes" MongoDB collection (metadata + extracted text). */
@Document(collection = "resumes")
public class Resume {

    /** MongoDB generates this ObjectId (as a String) on first save. */
    @Id
    private String id;

    /** Original uploaded file name (can be renamed via PUT). */
    private String fileName;

    /** File name on disk (UUID based) so two uploads with the same name never clash. */
    private String storedFileName;

    /** "pdf" or "docx". */
    private String fileType;

    /** File size in bytes. */
    private long fileSize;

    /** Plain text extracted by Apache Tika, used later for ATS analysis. */
    private String extractedText;

    private LocalDateTime uploadDate;

    private ProcessingStatus processingStatus;

    public Resume() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getStoredFileName() { return storedFileName; }
    public void setStoredFileName(String storedFileName) { this.storedFileName = storedFileName; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }

    public String getExtractedText() { return extractedText; }
    public void setExtractedText(String extractedText) { this.extractedText = extractedText; }

    public LocalDateTime getUploadDate() { return uploadDate; }
    public void setUploadDate(LocalDateTime uploadDate) { this.uploadDate = uploadDate; }

    public ProcessingStatus getProcessingStatus() { return processingStatus; }
    public void setProcessingStatus(ProcessingStatus processingStatus) { this.processingStatus = processingStatus; }
}
