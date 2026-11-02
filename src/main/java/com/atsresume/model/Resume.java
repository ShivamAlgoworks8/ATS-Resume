package com.atsresume.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Model: a resume stored in the "resumes" MongoDB collection. */
@Document(collection = "resumes")
public class Resume {

    /** MongoDB generates this ObjectId (as a String) on first save. */
    @Id
    private String id;

    /** Original uploaded file name. */
    private String fileName;

    /** Plain text extracted from the resume file, used later for ATS analysis. */
    private String extractedText;

    public Resume() {
    }

    public Resume(String fileName, String extractedText) {
        this.fileName = fileName;
        this.extractedText = extractedText;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getExtractedText() { return extractedText; }
    public void setExtractedText(String extractedText) { this.extractedText = extractedText; }
}
