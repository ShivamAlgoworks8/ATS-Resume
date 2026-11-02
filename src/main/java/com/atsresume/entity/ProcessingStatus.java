package com.atsresume.entity;

/** Lifecycle of a resume after upload. */
public enum ProcessingStatus {
    /** File saved, text extraction not finished yet. */
    PENDING,
    /** Text extracted successfully. */
    COMPLETED,
    /** Text extraction failed. */
    FAILED
}

