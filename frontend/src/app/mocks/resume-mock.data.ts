import { StructuredResume } from '../models/resume.models';

export function createEmptyStructuredResume(): StructuredResume {
  return {
    contact: {
      fullName: 'Aditya Srivastav',
      title: 'Principal Full Stack Engineer',
      totalExperience: 'Total Experience: 15 Years',
      email: 'aditya.srivastav@example.com',
      phone: '+91 98765 43210',
      location: 'New Delhi, India',
      linkedin: 'linkedin.com/in/adityasrivastav',
      github: 'github.com/adityasrivastav',
      portfolio: '',
    },
    professionalSummary:
      'Principal Full Stack Engineer with 15 years of professional experience working across ES6+, Java, Python, JavaScript, TypeScript, SQL, Go, React.js, Next.js, and Redux. Professional work includes application development, system integration, API-driven workflows, databases, cloud technologies, and structured software delivery supported by the resume. Experienced in translating functional and technical requirements into maintainable implementations, collaborating across engineering activities, troubleshooting issues, and validating technical outcomes.',
    skillCategories: [
      {
        id: 'cat-1',
        categoryName: 'Core Technologies',
        skills: [
          'ES6+',
          'Java',
          'Python',
          'JavaScript',
          'TypeScript',
          'SQL',
          'Go',
          'React.js',
          'Next.js',
          'Redux',
          'Micro-Frontends',
          'HTML5',
          'CSS3',
          'Tailwind CSS',
          'Spring Boot',
          'Spring Cloud',
          'Node.js',
          'Express.js',
          'FastAPI',
          'REST',
        ],
      },
      {
        id: 'cat-2',
        categoryName: 'Architecture & Cloud',
        skills: [
          'GraphQL',
          'gRPC',
          'OAuth2',
          'OIDC',
          'JWT',
          'Microservices',
          'Event-Driven Design',
          'CQRS',
          'Event Sourcing',
          'Domain-Driven Design',
          'Multi-Tenancy',
          'API Strategy',
          'Enterprise Architecture',
          'AWS',
          'Azure',
          'GCP',
          'Docker',
          'Kubernetes',
          'Helm',
          'Terraform',
        ],
      },
      {
        id: 'cat-3',
        categoryName: 'DevOps, Data & Tools',
        skills: [
          'Jenkins',
          'GitHub Actions',
          'GitOps',
          'Service Mesh',
          'PostgreSQL',
          'MySQL',
          'Oracle',
          'MongoDB',
          'Cassandra',
          'Redis',
          'Elasticsearch',
          'Apache Kafka',
          'RabbitMQ',
          'Spark',
          'Airflow',
          'TensorFlow',
          'PyTorch',
          'scikit-learn',
          'OpenCV',
          'LLM',
          'RAG Systems',
          'Vector Databases',
          'Prometheus',
          'Grafana',
        ],
      },
    ],
    experience: [],
    projects: [
      {
        id: 'proj-1',
        title: 'Enterprise Payment Orchestration Platform',
        technologies: 'Spring Boot, PostgreSQL, Kubernetes, Grafana, Redis, Kafka, Java, AWS',
        link: '',
        startDate: '',
        endDate: '2023',
        description:
          'Worked on an enterprise Payment Orchestration Platform, including payment integration and reporting dashboards.',
        capabilities: 'Dashboard development, Database integration, Data visualization',
        bullets: [
          'Delivered active-active multi-region deployment with sub-5-minute failover and 99.99% availability.',
        ],
      },
      {
        id: 'proj-2',
        title: 'Multi-Tenant Identity & Access Management Platform',
        technologies: 'Spring Security, PostgreSQL, Kubernetes, OAuth2, Redis, Azure, Java, OIDC',
        link: '',
        startDate: '',
        endDate: '2022',
        description:
          'Designed centralized SSO, MFA, and RBAC platform with tenant-level isolation, serving 200+ enterprise tenants and 8M+ users. Achieved SOC Type II and ISO 27001 readiness through audit logging, encryption at rest and in transit, and automated access reviews.',
        capabilities: 'Role-based access, REST APIs, Database integration',
        bullets: [
          'Delivered active-active multi-region deployment with sub-5-minute failover and 99.99% availability.',
        ],
      },
      {
        id: 'proj-3',
        title: 'Enterprise Cloud Migration Program',
        technologies: 'PostgreSQL, Kubernetes, Terraform, Jenkins, Docker, Oracle, Java, AWS',
        link: '',
        startDate: '',
        endDate: '2020',
        description:
          'Led migration of 60+ legacy applications and 40+ TB of data to AWS using phased re-platforming, with zero unplanned downtime during cutovers. Built reusable Terraform landing-zone modules and migration runbooks, cutting per-application migration effort by 45%.',
        capabilities: 'Database integration',
        bullets: [
          'Reduced hosting and licensing costs for clients by an average of 35% while improving deployment frequency 10x.',
        ],
      },
      {
        id: 'proj-4',
        title: 'Real-Time Analytics & Data Streaming Platform',
        technologies: 'Spark Streaming, Elasticsearch, Apache Kafka, Python, Docker, Kibana, Kafka, Spark, AWS',
        link: '',
        startDate: '',
        endDate: '2022',
        description:
          'Worked on a real-Time Analytics & Data Streaming Platform, including reporting dashboards and search and filtering.',
        capabilities: 'Dashboard development, Data visualization',
        bullets: [
          'Implemented schema evolution, back-pressure handling, and automated replay, achieving 99.95% pipeline availability.',
        ],
      },
      {
        id: 'proj-5',
        title: 'Enterprise API Gateway & Developer Platform',
        technologies:
          'Spring Cloud Gateway, Spring Cloud, React.js, Node.js, OpenAPI, React, Redis, Java, Kong, AWS, Python, JavaScript, Kubernetes',
        link: '',
        startDate: '',
        endDate: '2020',
        description: 'Contributed to a business management portal designed to streamline operational workflows.',
        capabilities: 'Access control, API integration',
        bullets: [
          'Handled 150M+ API calls per month with p99 gateway overhead under 15ms. Observability & SRE Platform 2022 2023 Prometheus, Grafana, OpenTelemetry, ELK, Python, Go, Kubernetes.',
        ],
      },
    ],
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
    lines[0] && lines[0].length <= 50 && !lines[0].includes('@') && !/summary|experience|stack|skills/i.test(lines[0])
      ? lines[0]
      : fileName.replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ');

  const titleMatch = lines.find(
    (l, idx) =>
      idx > 0 &&
      idx < 5 &&
      /\b(engineer|developer|architect|consultant|manager|lead|specialist|designer|analyst)\b/i.test(l)
  );
  const inferredTitle = titleMatch || '';

  const expMatch = lines.find((l) => /total\s+experience\s*:/i.test(l));
  const inferredTotalExp = expMatch ? expMatch.trim() : '';

  // Check for explicit PROFESSIONAL SUMMARY section
  let summaryCandidate = '';
  const summaryIdx = lines.findIndex((l) => /^professional\s+summary$/i.test(l));
  if (summaryIdx >= 0 && summaryIdx + 1 < lines.length) {
    summaryCandidate = lines[summaryIdx + 1];
    if (summaryIdx + 2 < lines.length && !/^(technology\s+stack|skills|projects|experience)/i.test(lines[summaryIdx + 2])) {
      summaryCandidate += ' ' + lines[summaryIdx + 2];
    }
  }

  // Check for PROJECT EXPERIENCE sections in text
  const parsedProjects: StructuredResume['projects'] = [];
  const projExpIdx = lines.findIndex((l) => /^project\s+experience$/i.test(l));
  if (projExpIdx >= 0) {
    let currentProj: Partial<StructuredResume['projects'][0]> | null = null;
    let inBullets = false;

    for (let i = projExpIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^(education|certifications|achievements)$/i.test(line)) {
        if (currentProj && currentProj.title) {
          parsedProjects.push({
            id: `proj-${parsedProjects.length + 1}`,
            title: currentProj.title,
            technologies: currentProj.technologies || '',
            link: '',
            startDate: '',
            endDate: currentProj.endDate || '',
            description: currentProj.description || '',
            capabilities: currentProj.capabilities || '',
            bullets: currentProj.bullets || [],
          });
        }
        break;
      }

      // Check for project title line: e.g. "Enterprise Payment Orchestration Platform 2023"
      const dateMatch = line.match(/\b(19\d\d|20\d\d)\b/);
      if (
        dateMatch &&
        !line.toLowerCase().includes('technology stack') &&
        !line.toLowerCase().includes('key capabilities') &&
        !line.toLowerCase().includes('responsibilities') &&
        line.length < 80
      ) {
        if (currentProj && currentProj.title) {
          parsedProjects.push({
            id: `proj-${parsedProjects.length + 1}`,
            title: currentProj.title,
            technologies: currentProj.technologies || '',
            link: '',
            startDate: '',
            endDate: currentProj.endDate || '',
            description: currentProj.description || '',
            capabilities: currentProj.capabilities || '',
            bullets: currentProj.bullets || [],
          });
        }
        const year = dateMatch[0];
        const title = line.replace(year, '').trim();
        currentProj = {
          title: title || line,
          endDate: year,
          bullets: [],
        };
        inBullets = false;
        continue;
      }

      if (!currentProj) continue;

      if (/key\s+capabilities\s*:/i.test(line)) {
        currentProj.capabilities = line.replace(/key\s+capabilities\s*:/i, '').trim();
      } else if (/technology\s+stack\s+used\s*:/i.test(line)) {
        currentProj.technologies = line.replace(/technology\s+stack\s+used\s*:/i, '').trim();
      } else if (/responsibilities/i.test(line)) {
        inBullets = true;
      } else if (inBullets || line.startsWith('•') || line.startsWith('-')) {
        const cleanBullet = line.replace(/^[•\-\*]\s*/, '').trim();
        if (cleanBullet) {
          currentProj.bullets = [...(currentProj.bullets || []), cleanBullet];
        }
      } else if (!currentProj.description && line.length > 20) {
        currentProj.description = line;
      }
    }

    if (currentProj && currentProj.title) {
      parsedProjects.push({
        id: `proj-${parsedProjects.length + 1}`,
        title: currentProj.title,
        technologies: currentProj.technologies || '',
        link: '',
        startDate: '',
        endDate: currentProj.endDate || '',
        description: currentProj.description || '',
        capabilities: currentProj.capabilities || '',
        bullets: currentProj.bullets || [],
      });
    }
  }

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

  const finalSummary = summaryCandidate || contentLines[0] || '';
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
      title: inferredTitle,
      totalExperience: inferredTotalExp,
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0].trim() : '',
      location: '',
      linkedin: linkedinMatch ? linkedinMatch[0] : '',
      github: githubMatch ? githubMatch[0] : '',
      portfolio: '',
    },
    professionalSummary: finalSummary,
    skillCategories,
    experience:
      expBullets.length > 0
        ? [
            {
              id: 'exp-1',
              company: 'Extracted from Uploaded Resume',
              jobTitle: inferredTitle || 'Professional Experience',
              location: '',
              startDate: '',
              endDate: '',
              bullets: expBullets,
            },
          ]
        : [],
    projects:
      parsedProjects.length > 0
        ? parsedProjects
        : projBullets.length > 0
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

export function buildPreviewAtsAnalysis(
  resumeId: string,
  structured: StructuredResume,
  extractedText: string | null,
  jobTitle: string,
  companyName: string,
  jobDescription: string
): AtsAnalysisResponse {
  const resumeCorpus = [
    extractedText || '',
    structured.professionalSummary,
    ...structured.skillCategories.flatMap((c) => c.skills),
    ...structured.experience.flatMap((e) => [e.jobTitle, e.company, ...e.bullets]),
    ...structured.projects.flatMap((p) => [p.title, p.technologies, ...p.bullets]),
    ...structured.education.flatMap((ed) => [ed.institution, ed.degree, ed.fieldOfStudy]),
  ]
    .join(' ')
    .toLowerCase();

  const jdLower = jobDescription.toLowerCase();

  const technicalCatalog = [
    'Java',
    'Java 21',
    'Spring Boot',
    'Spring Data',
    'Spring Security',
    'MongoDB',
    'REST APIs',
    'Microservices',
    'Apache Tika',
    'Maven',
    'Gradle',
    'Angular',
    'TypeScript',
    'JavaScript',
    'React',
    'Node.js',
    'RxJS',
    'SCSS',
    'HTML',
    'CSS',
    'Docker',
    'Kubernetes',
    'AWS',
    'Azure',
    'GCP',
    'CI/CD',
    'PostgreSQL',
    'MySQL',
    'Redis',
    'Kafka',
    'JUnit',
    'Mockito',
    'Git',
    'Python',
    'SQL',
    'Agile',
    'System Design',
  ];

  const catalogInJd = technicalCatalog.filter((kw) => jdLower.includes(kw.toLowerCase()));

  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'you', 'will', 'are', 'our', 'that', 'this',
    'from', 'have', 'has', 'not', 'but', 'what', 'all', 'were', 'when', 'your',
    'can', 'said', 'there', 'use', 'each', 'which', 'she', 'how', 'their',
    'work', 'role', 'team', 'experience', 'years', 'strong', 'looking', 'join',
    'build', 'design', 'develop', 'software', 'engineer', 'developer', 'required',
    'responsibilities', 'qualifications', 'skills', 'ability', 'working', 'using',
  ]);

  const dynamicJdTokens = Array.from(
    new Set(
      (jobDescription.match(/\b[A-Za-z][A-Za-z0-9+#.-]{2,18}\b/g) || [])
        .map((w) => w.replace(/[.,;:]+$/, ''))
        .filter((w) => w.length >= 3 && !stopWords.has(w.toLowerCase()))
    )
  ).slice(0, 12);

  const targetKeywords =
    catalogInJd.length >= 3 ? catalogInJd : Array.from(new Set([...catalogInJd, ...dynamicJdTokens])).slice(0, 14);

  const matchedKeywords = targetKeywords.filter((kw) =>
    resumeCorpus.includes(kw.toLowerCase())
  );
  const missingKeywords = targetKeywords.filter(
    (kw) => !resumeCorpus.includes(kw.toLowerCase())
  );

  const allResumeSkills = structured.skillCategories.flatMap((c) => c.skills);
  const relevantSkills = allResumeSkills.filter(
    (s) =>
      targetKeywords.some((tk) => tk.toLowerCase() === s.toLowerCase()) ||
      jdLower.includes(s.toLowerCase())
  );
  const extraOrLessRelevantTerms = allResumeSkills.filter(
    (s) => !relevantSkills.includes(s)
  );

  const skillsMatchPercentage =
    targetKeywords.length > 0
      ? Math.min(100, Math.round((matchedKeywords.length / targetKeywords.length) * 100))
      : 0;

  const totalBullets =
    structured.experience.reduce((acc, e) => acc + e.bullets.length, 0) +
    structured.projects.reduce((acc, p) => acc + p.bullets.length, 0);
  const hasMetrics = /\b(\d+%|\d+x|\d+\+|\d+\s*(ms|seconds|users|endpoints|apis|modules|years))\b/i.test(
    resumeCorpus
  );

  const wordCount = (extractedText || '').trim().split(/\s+/).filter(Boolean).length;
  const experienceRelevance =
    wordCount > 0
      ? Math.min(96, Math.max(35, 50 + Math.min(30, totalBullets * 5) + (hasMetrics ? 12 : 0)))
      : 0;
  const educationRelevance = structured.education.length > 0 || /bachelor|master|b\.tech|degree|university|college/i.test(resumeCorpus) ? 88 : 50;
  const formattingScore =
    (structured.contact.email ? 25 : 0) +
    (structured.contact.phone ? 15 : 0) +
    (allResumeSkills.length > 0 ? 30 : 10) +
    (wordCount >= 40 ? 30 : 10);

  const overallScore = Math.round(
    skillsMatchPercentage * 0.45 +
      experienceRelevance * 0.25 +
      educationRelevance * 0.1 +
      formattingScore * 0.2
  );

  const suggestions: ResumeSuggestion[] = [];

  missingKeywords.slice(0, 5).forEach((kw, idx) => {
    suggestions.push({
      id: `sug-skill-${idx + 1}`,
      category: 'MISSING_SKILLS',
      title: `Add "${kw}" to Technical Skills (If Applicable)`,
      targetSection: 'Skills',
      currentIssue: `"${kw}" is required in the Job Description but was not found in your uploaded resume.`,
      reason: `ATS keyword filters score exact matches for "${kw}" against the target Job Description.`,
      suggestedChange: kw,
      requiresCandidateVerification: true,
      decision: 'PENDING',
    });
  });

  if (missingKeywords.length > 0) {
    const kwList = missingKeywords.slice(0, 3).join(', ');
    suggestions.push({
      id: 'sug-kw-1',
      category: 'MISSING_KEYWORDS',
      title: 'Integrate Missing JD Keywords into Experience Bullets',
      targetSection: 'Work Experience',
      currentIssue: `Key terms (${kwList}) from your pasted Job Description are absent from your experience descriptions.`,
      reason: 'Contextual keyword placement inside work experience bullets increases both ATS relevance and recruiter clarity.',
      suggestedChange: `Delivered production features utilizing ${matchedKeywords.slice(0, 2).join(' and ') || 'core technologies'} in alignment with ${kwList} requirements.`,
      requiresCandidateVerification: true,
      decision: 'PENDING',
    });
  }

  suggestions.push({
    id: 'sug-summary-1',
    category: 'SUMMARY_IMPROVEMENTS',
    title: `Align Professional Summary with "${jobTitle || 'Target Role'}"`,
    targetSection: 'Summary',
    currentIssue: 'Your summary can more directly state the target role and matched technical competencies.',
    reason: 'Placing the exact target role title and core matched skills in the top summary improves ATS section weighting.',
    suggestedChange: `Detail-oriented professional targeting ${jobTitle || 'this role'}${companyName ? ' at ' + companyName : ''}, bringing hands-on proficiency in ${matchedKeywords.slice(0, 5).join(', ') || 'software development and problem solving'}.`,
    requiresCandidateVerification: false,
    decision: 'PENDING',
  });

  if (!hasMetrics) {
    suggestions.push({
      id: 'sug-metric-1',
      category: 'ACHIEVEMENTS_METRICS',
      title: 'Quantify Impact in Work Experience & Projects',
      targetSection: 'Work Experience & Projects',
      currentIssue: 'Few quantifiable metrics (percentages, response times, scale) were detected in your resume text.',
      reason: 'Measurable outcomes substantiate your technical contributions during both ATS and human review.',
      suggestedChange: 'Quantify bullet points with concrete metrics (e.g., latency reduction %, number of APIs built, or test coverage %).',
      requiresCandidateVerification: false,
      decision: 'PENDING',
    });
  }

  return {
    analysisId: `analysis-${Date.now()}`,
    resumeId,
    jobTitle: jobTitle || 'Target Role',
    companyName: companyName || '',
    analyzedAt: new Date().toISOString(),
    isMockPreview: true,
    overallScore,
    skillsMatchPercentage,
    experienceRelevance,
    educationRelevance,
    formattingScore,
    matchedKeywords,
    missingKeywords,
    relevantSkills: relevantSkills.length > 0 ? relevantSkills : matchedKeywords,
    extraOrLessRelevantTerms,
    sectionEvaluations: [
      {
        sectionName: 'Contact Information',
        status: structured.contact.email && structured.contact.phone ? 'STRONG' : 'NEEDS_WORK',
        score: structured.contact.email && structured.contact.phone ? 95 : 55,
        summary:
          structured.contact.email && structured.contact.phone
            ? 'Email and phone number were cleanly extracted from your resume.'
            : 'Ensure your email address and phone number are in plain text at the top of the document.',
        details: [
          structured.contact.email ? `Email: ${structured.contact.email}` : 'Email not detected',
          structured.contact.phone ? `Phone: ${structured.contact.phone}` : 'Phone not detected',
        ],
      },
      {
        sectionName: 'Skills & Keyword Alignment',
        status: skillsMatchPercentage >= 75 ? 'STRONG' : skillsMatchPercentage >= 50 ? 'MODERATE' : 'NEEDS_WORK',
        score: skillsMatchPercentage,
        summary: `Matched ${matchedKeywords.length} out of ${targetKeywords.length} target keywords extracted from your Job Description.`,
        details: [
          `Matched (${matchedKeywords.length}): ${matchedKeywords.join(', ') || 'None'}`,
          `Missing (${missingKeywords.length}): ${missingKeywords.join(', ') || 'None'}`,
        ],
      },
      {
        sectionName: 'Experience & Project Depth',
        status: experienceRelevance >= 75 ? 'STRONG' : 'MODERATE',
        score: experienceRelevance,
        summary: `Analyzed ${wordCount} extracted words and ${totalBullets} structured bullet items.`,
        details: [
          hasMetrics ? 'Quantifiable metrics detected in text' : 'Add measurable numbers/metrics to strengthen bullets',
        ],
      },
      {
        sectionName: 'ATS Readability & Formatting',
        status: formattingScore >= 75 ? 'STRONG' : 'MODERATE',
        score: formattingScore,
        summary: 'Evaluated plain-text extraction quality from Apache Tika.',
        details: [
          `Extracted ${wordCount} words from uploaded file`,
          'Ready for single-column ATS template generation',
        ],
      },
    ],
    readabilityChecks: [
      {
        label: 'Apache Tika Text Extraction',
        passed: wordCount >= 20,
        detail: `Extracted ${wordCount} words directly from your uploaded resume file.`,
      },
      {
        label: 'Contact Header Parseability',
        passed: Boolean(structured.contact.email),
        detail: structured.contact.email
          ? `Detected email (${structured.contact.email})`
          : 'No email address detected in plain text.',
      },
      {
        label: 'Keyword Density Check',
        passed: matchedKeywords.length > 0,
        detail: `${matchedKeywords.length} of ${targetKeywords.length} JD keywords present in resume.`,
      },
    ],
    executiveSummary: `Based on your uploaded resume (${wordCount} words extracted) and the provided Job Description, your current ATS match score is ${overallScore}/100 (${matchedKeywords.length} matched keywords, ${missingKeywords.length} missing keywords).`,
    suggestions,
  };
}
