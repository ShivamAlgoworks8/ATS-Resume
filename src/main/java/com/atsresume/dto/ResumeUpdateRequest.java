package com.atsresume.dto;

/**
 * Data Transfer Object (DTO) for updating resume metadata via PUT /api/v1/resumes/{id}.
 */
public class ResumeUpdateRequest {

    /** Updated original/display file name */
    private String originalFileName;

    /** Updated custom file name */
    private String fileName;

    public ResumeUpdateRequest() {
    }

    public ResumeUpdateRequest(String originalFileName, String fileName) {
        this.originalFileName = originalFileName;
        this.fileName = fileName;
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
}
