import { Component, input } from '@angular/core';
import {
  AchievementItem,
  ProjectItem,
  StructuredResume,
  WorkExperienceItem,
} from '../../models/resume.models';

@Component({
  selector: 'app-algoworks-resume',
  standalone: true,
  templateUrl: './algoworks-resume.component.html',
})
export class AlgoworksResumeComponent {
  readonly resume = input.required<StructuredResume>();
  readonly fallbackTitle = input('');

  contactDetails(): string[] {
    const contact = this.resume().contact;
    return [contact.location, contact.phone, contact.email, contact.linkedin, contact.github, contact.portfolio]
      .map((value) => value?.trim() ?? '')
      .filter(Boolean);
  }

  allSkills(): string[] {
    return (this.resume().skillCategories || []).flatMap((category) => category.skills || []);
  }

  skillRows(columns = 4): string[][] {
    const skills = this.allSkills();
    const rows: string[][] = [];
    for (let index = 0; index < skills.length; index += columns) {
      const slice = skills.slice(index, index + columns);
      while (slice.length < columns) {
        slice.push('');
      }
      rows.push(slice);
    }
    return rows;
  }

  projectDate(project: ProjectItem): string {
    return (project.endDate || project.startDate || '').trim();
  }

  experienceDate(experience: WorkExperienceItem): string {
    return [experience.startDate, experience.endDate].filter((part) => part?.trim()).join(' – ');
  }

  experienceTech(experience: WorkExperienceItem): string {
    const description = `${experience.jobTitle} ${(experience.bullets || []).join(' ')}`.toLowerCase();
    const matched = this.allSkills().filter(
      (skill) => skill.trim() && description.includes(skill.toLowerCase())
    );
    return matched.slice(0, 10).join(', ');
  }

  achievementMeta(item: AchievementItem): string {
    return [item.issuerOrContext, item.date].filter((part) => !!part?.trim()).join(', ');
  }

  visibleBullets(bullets: string[] | undefined): string[] {
    return (bullets || []).map((bullet) => bullet.trim()).filter((bullet) => bullet.length > 0);
  }
}
