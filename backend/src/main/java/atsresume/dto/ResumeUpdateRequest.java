package com.atsresume.dto;

public class ResumeUpdateRequest {

    private String originalFileName;
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
