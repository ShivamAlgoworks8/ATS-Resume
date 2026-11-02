package com.atsresume.repository;

import com.atsresume.entity.Resume;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Repository: Spring Data generates the implementation at runtime.
 * Inherits save, findById, findAll, deleteById, etc.; custom queries can be added later.
 */
public interface ResumeRepository extends MongoRepository<Resume, String> {
}
