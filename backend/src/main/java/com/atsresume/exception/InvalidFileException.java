package com.atsresume.exception;

/** Thrown when an uploaded file or request fails validation (HTTP 400). */
public class InvalidFileException extends RuntimeException {
    public InvalidFileException(String message) {
        super(message);
    }
}

