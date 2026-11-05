package com.atsresume.repository;

import com.atsresume.model.Resume;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for MongoDB CRUD operations on Resume documents.
 * Spring Data MongoDB generates the implementation dynamically at runtime.
 */
@Repository
public interface ResumeRepository extends MongoRepository<Resume, String> {
}
