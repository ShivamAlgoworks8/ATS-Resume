package com.atsresume;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point of the ATS Resume Maker backend.
 * Layering: Controller -> Service -> Repository -> Model (sub-packages of com.atsresume,
 * which @SpringBootApplication scans automatically).
 */
@SpringBootApplication
public class AtsResumeMakerApplication {

    public static void main(String[] args) {
        SpringApplication.run(AtsResumeMakerApplication.class, args);
    }
}
