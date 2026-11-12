import { StructuredResume } from '../models/resume.models';

export function createEmptyStructuredResume(): StructuredResume {
  return {
    contact: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: '',
    },
    professionalSummary: '',
    skillCategories: [
      { id: 'cat-1', categoryName: 'Languages & Core', skills: [] },
      { id: 'cat-2', categoryName: 'Frameworks & Libraries', skills: [] },
      { id: 'cat-3', categoryName: 'Databases, Cloud & Tools', skills: [] },
    ],
    experience: [],
    projects: [],
    education: [],
    achievements: [],
  };
}

export function parseExtractedTextToStructuredResume(
  rawText: string | null | undefined,
  fileName: string
): StructuredResume {
  const cleanText = (rawText || '').trim();
  if (!cleanText) {
    const empty = createEmptyStructuredResume();
    empty.contact.fullName = fileName
      .replace(/\.(pdf|docx)$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    return empty;
  }

  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const emailMatch = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = cleanText.match(/(\+?\d{1,3}[\s-]?)?(\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4}/);
  const linkedinMatch = cleanText.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const githubMatch = cleanText.match(/github\.com\/[a-zA-Z0-9_-]+/i);

  const inferredName =
    lines[0] && lines[0].length <= 50 && !lines[0].includes('@')
      ? lines[0]
      : fileName.replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ');

  const knownSkillsCatalog: Record<string, string[]> = {
    'Languages & Core': [
      'Java',
      'Java 21',
      'TypeScript',
      'JavaScript',
      'Python',
      'C++',
      'C#',
      'Go',
      'SQL',
      'HTML',
      'CSS',
      'SCSS',
    ],
    'Frameworks & Libraries': [
      'Spring Boot',
      'Spring Data',
      'Spring MVC',
      'Spring Security',
      'Angular',
      'React',
      'Next.js',
      'Node.js',
      'Express',
      'Hibernate',
      'JUnit',
      'Mockito',
      'Apache Tika',
      'RxJS',
    ],
    'Databases, Cloud & Tools': [
      'MongoDB',
      'MySQL',
      'PostgreSQL',
      'Redis',
      'Docker',
      'Kubernetes',
      'AWS',
      'GCP',
      'Azure',
      'Git',
      'GitHub',
      'Maven',
      'Gradle',
      'CI/CD',
      'REST APIs',
      'Microservices',
      'Kafka',
      'Linux',
    ],
  };

  const lowerText = cleanText.toLowerCase();
  const skillCategories = Object.entries(knownSkillsCatalog).map(([categoryName, catalog], idx) => {
    const detected = catalog.filter((skill) => lowerText.includes(skill.toLowerCase()));
    return {
      id: `cat-${idx + 1}`,
      categoryName,
      skills: detected,
    };
  });

  const contentLines = lines.filter(
    (l) =>
      l.length > 28 &&
      l.length < 260 &&
      !l.includes('@') &&
      l !== inferredName &&
      !/^(summary|experience|work experience|education|skills|technical skills|projects|certifications|achievements)$/i.test(
        l
      )
  );

  const summaryCandidate = contentLines[0] || '';
  const expBullets = contentLines.slice(1, 5);
  const projBullets = contentLines.slice(5, 8);

  const eduLine = lines.find((l) =>
    /\b(b\.?tech|bachelor|master|m\.?tech|b\.?e|b\.?sc|m\.?sc|computer science|engineering|university|institute|college)\b/i.test(
      l
    )
  );

  return {
    contact: {
      fullName: inferredName,
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0].trim() : '',
      location: '',
      linkedin: linkedinMatch ? linkedinMatch[0] : '',
      github: githubMatch ? githubMatch[0] : '',
      portfolio: '',
    },
    professionalSummary: summaryCandidate,
    skillCategories,
    experience:
      expBullets.length > 0
        ? [
            {
              id: 'exp-1',
              company: '',
              jobTitle: '',
              location: '',
              startDate: '',
              endDate: '',
              bullets: expBullets,
            },
          ]
        : [],
    projects:
      projBullets.length > 0
        ? [
            {
              id: 'proj-1',
              title: '',
              technologies: skillCategories
                .flatMap((c) => c.skills)
                .slice(0, 5)
                .join(', '),
              link: '',
              startDate: '',
              endDate: '',
              bullets: projBullets,
            },
          ]
        : [],
    education: eduLine
      ? [
          {
            id: 'edu-1',
            institution: eduLine,
            degree: '',
            fieldOfStudy: '',
            location: '',
            startDate: '',
            endDate: '',
            gradeOrHonors: '',
          },
        ]
      : [],
    achievements: [],
  };
}
