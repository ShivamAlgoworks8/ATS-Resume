package com.atsresume.model;

/**
 * Processing status of a resume after upload.
 */
public enum ProcessingStatus {
    /** File uploaded, text extraction in progress */
    PENDING,
    /** Text extracted successfully by Apache Tika */
    COMPLETED,
    /** Text extraction failed (e.g. corrupted file or unreadable content) */
    FAILED
}

