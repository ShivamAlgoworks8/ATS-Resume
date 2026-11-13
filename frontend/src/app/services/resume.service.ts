import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  AtsAnalysisRequest,
  AtsAnalysisResponse,
  OptimizeResumeRequest,
  ResumeMetadataUpdatePayload,
  ResumeRecord,
  StructuredResume,
} from '../models/resume.models';

export type { ResumeRecord } from '../models/resume.models';

@Injectable({ providedIn: 'root' })
export class ResumeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/resumes';

  readonly resumes = signal<ResumeRecord[]>([]);
  readonly loadingResumes = signal(false);

  loadResumes(): void {
    this.loadingResumes.set(true);
    this.http.get<ResumeRecord[]>(this.baseUrl).subscribe({
      next: (list) => {
        this.resumes.set(list);
        this.loadingResumes.set(false);
      },
      error: () => {
        this.loadingResumes.set(false);
      },
    });
  }

  getResumeById(id: string): Observable<ResumeRecord> {
    return this.http.get<ResumeRecord>(`${this.baseUrl}/${id}`);
  }

  uploadResume(file: File): Observable<ResumeRecord> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ResumeRecord>(this.baseUrl, formData).pipe(
      tap((created) => {
        this.resumes.update((list) => [created, ...list.filter((r) => r.id !== created.id)]);
      })
    );
  }

  updateResumeMetadata(
    id: string,
    payload: ResumeMetadataUpdatePayload
  ): Observable<ResumeRecord> {
    return this.http.put<ResumeRecord>(`${this.baseUrl}/${id}`, payload).pipe(
      tap((updated) => {
        this.resumes.update((list) => list.map((item) => (item.id === id ? updated : item)));
      })
    );
  }

  deleteResume(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.resumes.update((list) => list.filter((item) => item.id !== id));
      })
    );
  }

  analyzeResumeOnBackend(
    resumeId: string,
    payload: AtsAnalysisRequest
  ): Observable<AtsAnalysisResponse> {
    return this.http.post<AtsAnalysisResponse>(`${this.baseUrl}/${resumeId}/analyze`, payload);
  }

  optimizeResumeOnBackend(
    resumeId: string,
    payload: OptimizeResumeRequest
  ): Observable<StructuredResume> {
    return this.http.post<StructuredResume>(`${this.baseUrl}/${resumeId}/optimize`, payload);
  }

  saveStructuredResumeOnBackend(
    resumeId: string,
    structured: StructuredResume
  ): Observable<StructuredResume> {
    return this.http.put<StructuredResume>(`${this.baseUrl}/${resumeId}/structured`, structured);
  }

  generatePdfOnBackend(resumeId: string, latexSource: string): Observable<Blob> {
    return this.http.post(
      `${this.baseUrl}/${resumeId}/pdf`,
      { latexSource },
      { responseType: 'blob' }
    );
  }
}
