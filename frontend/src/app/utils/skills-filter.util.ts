const NON_TECH_AND_SOFT_SKILLS = new Set<string>([
  // Generic filler / non-skill words
  'technical', 'technology', 'technologies', 'skill', 'skills',
  'tool', 'tools', 'experience', 'knowledge', 'proficient', 'proficiency',
  'competency', 'competencies', 'competence', 'understanding',
  'ability', 'abilities', 'analysis', 'analytical', 'development',
  'developer', 'engineer', 'engineering', 'work', 'working',
  'responsibility', 'responsibilities', 'requirement', 'requirements',
  'qualification', 'qualifications', 'candidate', 'role', 'roles',
  'support', 'operations', 'operation', 'solutions', 'solution',
  'systems', 'system', 'design', 'management', 'methodology', 'methodologies',
  'best practices', 'best practice', 'process', 'processes', 'procedure', 'procedures',
  'standard', 'standards', 'practice', 'practices', 'framework', 'frameworks',
  'language', 'languages', 'software', 'hardware', 'application', 'applications',
  'platform', 'platforms', 'overview', 'basics', 'fundamentals', 'documentation',

  // Soft skills / behavioral attributes / personality traits
  'adaptability', 'adaptable',
  'attention to detail', 'detail oriented', 'detail-oriented', 'detail orientation',
  'communication', 'communications', 'communication skills', 'verbal communication',
  'written communication', 'oral communication', 'interpersonal communication',
  'teamwork', 'team player', 'team-player', 'team work', 'team building', 'team collaboration',
  'collaboration', 'collaborative', 'collaborator', 'collaborating',
  'cross-functional collaboration', 'cross functional collaboration', 'cross-functional teams',
  'problem solving', 'problem-solving', 'problem solver', 'troubleshooting skills',
  'critical thinking', 'critical thinker',
  'creative thinking', 'creativity', 'creative',
  'leadership', 'leader', 'leading',
  'time management', 'prioritization', 'prioritizing', 'multitasking', 'multi-tasking',
  'interpersonal', 'interpersonal skills',
  'work ethic', 'strong work ethic',
  'self-motivated', 'self motivated', 'self-starter', 'self starter', 'proactive', 'initiative',
  'fast learner', 'quick learner', 'eager to learn', 'willingness to learn', 'continuous learner',
  'flexibility', 'flexible',
  'organization', 'organizational', 'organizational skills', 'organized',
  'emotional intelligence', 'empathy',
  'presentation', 'presentation skills', 'public speaking',
  'decision making', 'decision-making',
  'conflict resolution', 'negotiation', 'negotiating',
  'active listening', 'listening',
  'relationship building', 'networking',
  'strategic thinking', 'strategic planning',
  'work independently', 'independent work', 'independent worker', 'working independently',
  'ownership', 'accountability',
  'enthusiasm', 'enthusiastic', 'passion', 'passionate',
  'curiosity', 'intellectual curiosity',
  'stress management', 'work under pressure', 'working under pressure',
  'punctuality', 'punctual', 'dependability', 'dependable', 'reliable', 'reliability',
  'customer service', 'client relations', 'stakeholder management',
  'mentoring', 'mentorship', 'coaching',
  'resourcefulness', 'resourceful',
  'positive attitude', 'can-do attitude', 'professionalism',
]);

export function isNonTechnicalOrSoftSkill(term?: string | null): boolean {
  if (!term) return false;
  const clean = term
    .replace(/^[+\-*•\s]+/, '')
    .replace(/[+\-*•\s]+$/, '')
    .trim()
    .toLowerCase();
  if (!clean) return true;

  if (NON_TECH_AND_SOFT_SKILLS.has(clean)) {
    return true;
  }

  const spaceNorm = clean.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (NON_TECH_AND_SOFT_SKILLS.has(spaceNorm)) {
    return true;
  }

  if (
    /^(?:soft|interpersonal|behavioral|communication|analytical|organizational|leadership)\s+skills?$/.test(spaceNorm) ||
    /^(?:technical|general|basic|core|key|target|required)\s+(?:skills?|knowledge|abilities?|tools?|competencies?)$/.test(spaceNorm) ||
    /^(?:strong|good|excellent|effective|proven)\s+(?:communication|teamwork|leadership|adaptability|problem solving|interpersonal skills?)$/.test(spaceNorm) ||
    /^(?:ability to|able to|willingness to|demonstrated ability)\b/.test(spaceNorm) ||
    /^(?:verbal|oral|written)\s+communication(?:\s+skills?)?$/.test(spaceNorm) ||
    /^(?:detail|results?|goal)\s+oriented(?:ness)?$/.test(spaceNorm)
  ) {
    return true;
  }

  return false;
}

