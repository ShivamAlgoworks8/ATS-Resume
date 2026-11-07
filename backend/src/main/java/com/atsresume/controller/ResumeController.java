package com.atsresume.controller;

import com.atsresume.dto.ResumeUpdateRequest;
import com.atsresume.model.Resume;
import com.atsresume.service.ResumeService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/resumes")
public class ResumeController {

    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Resume> uploadResume(@RequestPart("file") MultipartFile file) {
        Resume savedResume = resumeService.uploadResume(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedResume);
    }

    @GetMapping
    public ResponseEntity<List<Resume>> getAllResumes() {
        return ResponseEntity.ok(resumeService.getAllResumes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resume> getResumeById(@PathVariable String id) {
        return ResponseEntity.ok(resumeService.getResumeById(id));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Resume> updateResumeMetadataJson(
            @PathVariable String id,
            @RequestBody ResumeUpdateRequest updateRequest) {
        return ResponseEntity.ok(resumeService.updateResumeMetadata(id, updateRequest));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Resume> updateResumeMultipart(
            @PathVariable String id,
            @RequestParam(value = "fileName", required = false) String fileName,
            @RequestParam(value = "originalFileName", required = false) String originalFileName,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        return ResponseEntity.ok(resumeService.updateResume(id, fileName, originalFileName, file));
    }

    // Fallback when caller passes query params without JSON or multipart Content-Type
    @PutMapping(value = "/{id}")
    public ResponseEntity<Resume> updateResumeDefault(
            @PathVariable String id,
            @RequestParam(value = "fileName", required = false) String fileName,
            @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        ResumeUpdateRequest request = new ResumeUpdateRequest(originalFileName, fileName);
        return ResponseEntity.ok(resumeService.updateResumeMetadata(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResume(@PathVariable String id) {
        resumeService.deleteResume(id);
        return ResponseEntity.noContent().build();
    }
}
