package com.atsresume.exception;

/** Thrown when a resume id does not exist (HTTP 404). */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}

