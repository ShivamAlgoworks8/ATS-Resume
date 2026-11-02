package com.atsresume.controller;

import com.atsresume.entity.Resume;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** REST endpoints for resumes. Only handles HTTP; all logic lives in ResumeService. */
@RestController
@RequestMapping("/api/v1/resumes")
public class ResumeController {

    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    /** Upload a PDF/DOCX (multipart form field "file"). */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Resume> upload(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(resumeService.uploadResume(file));
    }

    @GetMapping
    public List<Resume> getAll() {
        return resumeService.getAllResumes();
    }

    @GetMapping("/{id}")
    public Resume getById(@PathVariable String id) {
        return resumeService.getResumeById(id);
    }

    /** Update: optional new "file" and/or new "fileName" (multipart form fields). */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Resume update(@PathVariable String id,
                         @RequestParam(value = "fileName", required = false) String fileName,
                         @RequestPart(value = "file", required = false) MultipartFile file) {
        return resumeService.updateResume(id, fileName, file);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        resumeService.deleteResume(id);
        return ResponseEntity.noContent().build();
    }
}
