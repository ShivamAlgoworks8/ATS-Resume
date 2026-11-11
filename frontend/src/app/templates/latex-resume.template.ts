import { StructuredResume } from '../models/resume.models';

export const PREDEFINED_LATEX_RESUME_TEMPLATE = String.raw`\documentclass[10pt,letterpaper]{article}

\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[margin=0.55in]{geometry}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{titlesec}
\usepackage{parskip}

\pagenumbering{gobble}
\setlength{\parindent}{0pt}
\setlist[itemize]{leftmargin=1.2em, nosep, topsep=2pt, itemsep=1.5pt}

\titleformat{\section}{\large\bfseries\uppercase}{}{0em}{}[\titlerule]
\titlespacing*{\section}{0pt}{8pt}{4pt}

\begin{document}

\begin{center}
    {\LARGE \textbf{{{FULL_NAME}}}} \\[3pt]
    {{CONTACT_LINE}}
\end{center}

{{SUMMARY_SECTION}}

{{SKILLS_SECTION}}

{{EXPERIENCE_SECTION}}

{{PROJECTS_SECTION}}

{{EDUCATION_SECTION}}

{{ACHIEVEMENTS_SECTION}}

\end{document}
`;

export function escapeLatex(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

export function generateLatexDocument(resume: StructuredResume): string {
  const c = resume.contact;
  const fullName = escapeLatex(c.fullName || 'Candidate Name');

  const contactParts: string[] = [];
  if (c.location?.trim()) contactParts.push(escapeLatex(c.location.trim()));
  if (c.phone?.trim()) contactParts.push(escapeLatex(c.phone.trim()));
  if (c.email?.trim()) {
    const emailEsc = escapeLatex(c.email.trim());
    contactParts.push(`\\href{mailto:${emailEsc}}{${emailEsc}}`);
  }
  if (c.linkedin?.trim()) {
    const liEsc = escapeLatex(c.linkedin.trim());
    contactParts.push(`\\href{https://${liEsc.replace(/^https?:\/\//, '')}}{${liEsc}}`);
  }
  if (c.github?.trim()) {
    const ghEsc = escapeLatex(c.github.trim());
    contactParts.push(`\\href{https://${ghEsc.replace(/^https?:\/\//, '')}}{${ghEsc}}`);
  }
  if (c.portfolio?.trim()) {
    const pfEsc = escapeLatex(c.portfolio.trim());
    contactParts.push(`\\href{https://${pfEsc.replace(/^https?:\/\//, '')}}{${pfEsc}}`);
  }
  const contactLine = contactParts.join(' \\,|\\, ');

  let summarySection = '';
  if (resume.professionalSummary?.trim()) {
    summarySection = [
      '\\section*{Professional Summary}',
      escapeLatex(resume.professionalSummary.trim()),
    ].join('\n');
  }

  const nonEmptySkillGroups = (resume.skillCategories || []).filter(
    (g) => g.skills && g.skills.length > 0
  );
  let skillsSection = '';
  if (nonEmptySkillGroups.length > 0) {
    const lines = nonEmptySkillGroups.map(
      (group) =>
        `\\textbf{${escapeLatex(group.categoryName)}:} ${group.skills
          .map((s) => escapeLatex(s))
          .join(', ')} \\\\`
    );
    skillsSection = ['\\section*{Technical Skills}', ...lines].join('\n');
  }

  let experienceSection = '';
  if (resume.experience && resume.experience.length > 0) {
    const expBlocks = resume.experience.map((exp) => {
      const dateRange = [exp.startDate, exp.endDate].filter(Boolean).join(' -- ');
      const header = `\\textbf{${escapeLatex(exp.jobTitle)}} \\hfill ${escapeLatex(dateRange)} \\\\\n\\textit{${escapeLatex(exp.company)}}${exp.location ? ` \\hfill \\textit{${escapeLatex(exp.location)}}` : ''}`;
      const bullets = (exp.bullets || []).filter((b) => b.trim().length > 0);
      const bulletBlock =
        bullets.length > 0
          ? [
              '\\begin{itemize}',
              ...bullets.map((b) => `    \\item ${escapeLatex(b)}`),
              '\\end{itemize}',
            ].join('\n')
          : '';
      return `${header}\n${bulletBlock}`;
    });
    experienceSection = ['\\section*{Work Experience}', expBlocks.join('\n\\vspace{5pt}\n')].join(
      '\n'
    );
  }

  let projectsSection = '';
  if (resume.projects && resume.projects.length > 0) {
    const projBlocks = resume.projects.map((proj) => {
      const dateRange = [proj.startDate, proj.endDate].filter(Boolean).join(' -- ');
      const techPart = proj.technologies?.trim()
        ? ` $|$ \\textit{${escapeLatex(proj.technologies.trim())}}`
        : '';
      const linkPart = proj.link?.trim() ? ` (${escapeLatex(proj.link.trim())})` : '';
      const header = `\\textbf{${escapeLatex(proj.title)}}${techPart}${linkPart} \\hfill ${escapeLatex(dateRange)}`;
      const bullets = (proj.bullets || []).filter((b) => b.trim().length > 0);
      const bulletBlock =
        bullets.length > 0
          ? [
              '\\begin{itemize}',
              ...bullets.map((b) => `    \\item ${escapeLatex(b)}`),
              '\\end{itemize}',
            ].join('\n')
          : '';
      return `${header}\n${bulletBlock}`;
    });
    projectsSection = ['\\section*{Projects}', projBlocks.join('\n\\vspace{5pt}\n')].join('\n');
  }

  let educationSection = '';
  if (resume.education && resume.education.length > 0) {
    const eduBlocks = resume.education.map((edu) => {
      const dateRange = [edu.startDate, edu.endDate].filter(Boolean).join(' -- ');
      const degreeLine = [edu.degree, edu.fieldOfStudy].filter(Boolean).join(' in ');
      const gradePart = edu.gradeOrHonors?.trim()
        ? ` (${escapeLatex(edu.gradeOrHonors.trim())})`
        : '';
      return `\\textbf{${escapeLatex(edu.institution)}} \\hfill ${escapeLatex(edu.location)} \\\\\n${escapeLatex(degreeLine)}${gradePart} \\hfill ${escapeLatex(dateRange)}`;
    });
    educationSection = ['\\section*{Education}', eduBlocks.join('\n\\vspace{4pt}\n')].join('\n');
  }

  let achievementsSection = '';
  if (resume.achievements && resume.achievements.length > 0) {
    const items = resume.achievements.map((ach) => {
      const meta = [ach.issuerOrContext, ach.date].filter(Boolean).join(', ');
      const metaStr = meta ? ` (${escapeLatex(meta)})` : '';
      const descStr = ach.description?.trim() ? ` -- ${escapeLatex(ach.description.trim())}` : '';
      return `    \\item \\textbf{${escapeLatex(ach.title)}}${metaStr}${descStr}`;
    });
    achievementsSection = [
      '\\section*{Achievements \\& Certifications}',
      '\\begin{itemize}',
      ...items,
      '\\end{itemize}',
    ].join('\n');
  }

  return PREDEFINED_LATEX_RESUME_TEMPLATE.replace('{{FULL_NAME}}', fullName)
    .replace('{{CONTACT_LINE}}', contactLine)
    .replace('{{SUMMARY_SECTION}}', summarySection)
    .replace('{{SKILLS_SECTION}}', skillsSection)
    .replace('{{EXPERIENCE_SECTION}}', experienceSection)
    .replace('{{PROJECTS_SECTION}}', projectsSection)
    .replace('{{EDUCATION_SECTION}}', educationSection)
    .replace('{{ACHIEVEMENTS_SECTION}}', achievementsSection)
    .replace(/\n{3,}/g, '\n\n');
}
