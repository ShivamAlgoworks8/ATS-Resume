package com.atsresume.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "resumes")
public class Resume {

    @Id
    private String id;

    private String originalFileName;
    private String fileName;

    // Internal disk key, kept separate from editable display names
    @JsonIgnore
    private String storageFileName;

    private String fileType;
    private long fileSize;
    private String extractedText;
    private LocalDateTime uploadDate;
    private ProcessingStatus processingStatus;

    // Parsed resume sections (editable) and how they were produced: GROQ or HEURISTIC
    private Map<String, Object> structuredResume;
    private String parsingMethod;
    private int totalExperienceMonths;

    @JsonIgnore
    private Map<String, Object> lastAnalysis;

    // Stores the raw AI result (as JSON text) for the last analysis input so identical scans stay identical
    @JsonIgnore
    private Map<String, Object> analysisAiCache;

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

    @JsonIgnore
    public String getStorageFileName() {
        return storageFileName;
    }

    @JsonIgnore
    public void setStorageFileName(String storageFileName) {
        this.storageFileName = storageFileName;
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

    public Map<String, Object> getStructuredResume() {
        return structuredResume;
    }

    public void setStructuredResume(Map<String, Object> structuredResume) {
        this.structuredResume = structuredResume;
    }

    public String getParsingMethod() {
        return parsingMethod;
    }

    public void setParsingMethod(String parsingMethod) {
        this.parsingMethod = parsingMethod;
    }

    public int getTotalExperienceMonths() {
        return totalExperienceMonths;
    }

    public void setTotalExperienceMonths(int totalExperienceMonths) {
        this.totalExperienceMonths = totalExperienceMonths;
    }

    @JsonIgnore
    public Map<String, Object> getLastAnalysis() {
        return lastAnalysis;
    }

    @JsonIgnore
    public void setLastAnalysis(Map<String, Object> lastAnalysis) {
        this.lastAnalysis = lastAnalysis;
    }

    @JsonIgnore
    public Map<String, Object> getAnalysisAiCache() {
        return analysisAiCache;
    }

    @JsonIgnore
    public void setAnalysisAiCache(Map<String, Object> analysisAiCache) {
        this.analysisAiCache = analysisAiCache;
    }
}
