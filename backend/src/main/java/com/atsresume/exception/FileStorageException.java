package com.atsresume.exception;

/** Thrown when reading/saving a file on disk fails (HTTP 500). */
public class FileStorageException extends RuntimeException {
    public FileStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}

