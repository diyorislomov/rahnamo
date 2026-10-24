'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  FileText,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  UploadCloud,
  Loader2,
  Award,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sliders,
  Clock,
  Compass,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Extracts plain text from a PDF, DOCX or TXT file entirely in the browser. */
async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || file.type === 'text/plain') {
    return await file.text();
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return value;
  }
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let line = '';
      const lines: string[] = [];
      for (const item of content.items) {
        if (!('str' in item)) continue;
        line += item.str;
        if (item.hasEOL) {
          lines.push(line);
          line = '';
        } else {
          line += ' ';
        }
      }
      if (line.trim()) lines.push(line);
      pages.push(lines.join('\n'));
    }
    return pages.join('\n');
  }
  throw new Error('unsupported');
}

export type RoleId = 'swe' | 'ai' | 'data' | 'pm' | 'design' | 'abroad';
export type SeniorityLevel = 'student' | 'junior' | 'mid_senior';

interface SkillCluster {
  canonical: string;
  synonyms: string[];
}

interface RoleSpec {
  id: RoleId;
  label: string;
  clusters: SkillCluster[];
  skills: { name: string; task: string }[];
}

const ROLES: RoleSpec[] = [
  {
    id: 'swe',
    label: 'Software Engineer',
    clusters: [
      { canonical: 'Programming Languages', synonyms: ['python', 'java', 'javascript', 'typescript', 'golang', 'go', 'c++', 'c#', 'rust', 'php', 'ruby', 'kotlin', 'swift'] },
      { canonical: 'Frontend Architecture', synonyms: ['react', 'next.js', 'vue', 'angular', 'svelte', 'tailwind', 'redux', 'html/css', 'webpack', 'vite'] },
      { canonical: 'Backend & APIs', synonyms: ['node', 'express', 'nestjs', 'django', 'fastapi', 'spring boot', 'flask', 'rest', 'graphql', 'grpc', 'microservices'] },
      { canonical: 'Databases & Cache', synonyms: ['sql', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'prisma', 'orm'] },
      { canonical: 'Cloud & DevOps', synonyms: ['docker', 'kubernetes', 'k8s', 'aws', 'gcp', 'azure', 'ci/cd', 'github actions', 'terraform', 'linux', 'git'] },
      { canonical: 'Engineering Rigor', synonyms: ['system design', 'distributed systems', 'unit testing', 'integration testing', 'jest', 'pytest', 'tdd', 'algorithms', 'concurrency'] },
    ],
    skills: [
      { name: 'Data Structures & Algorithms', task: 'Solve core patterns (Two Pointers, Sliding Window, Trees) on LeetCode' },
      { name: 'Git & Linux Workflows', task: 'Configure automated CI pipelines and manage branching workflows' },
      { name: 'Backend & REST/gRPC APIs', task: 'Build a production-ready API with authentication, rate limiting and database' },
      { name: 'Modern Frontend (Next.js/React)', task: 'Ship a responsive, accessible web app with server rendering and type safety' },
      { name: 'PostgreSQL & Query Optimization', task: 'Design normalized schemas with indexes and analyze execution plans' },
      { name: 'Docker & Cloud Deployment', task: 'Containerize multi-tier services and deploy to production cloud' },
      { name: 'Distributed System Design', task: 'Architect high-availability systems with caching, queues and replication' },
    ],
  },
  {
    id: 'ai',
    label: 'AI / ML Engineer',
    clusters: [
      { canonical: 'Core ML Frameworks', synonyms: ['pytorch', 'tensorflow', 'scikit-learn', 'keras', 'jax', 'numpy', 'pandas', 'scipy'] },
      { canonical: 'LLMs & GenAI', synonyms: ['llm', 'transformers', 'huggingface', 'rag', 'langchain', 'llamaindex', 'prompt engineering', 'fine-tuning', 'lora', 'embeddings', 'vector database', 'chromadb', 'pinecone'] },
      { canonical: 'NLP / Computer Vision', synonyms: ['nlp', 'bert', 'tokenization', 'computer vision', 'opencv', 'yolo', 'image segmentation'] },
      { canonical: 'MLOps & Production', synonyms: ['mlflow', 'wandb', 'dvc', 'triton', 'onnx', 'docker', 'model serving', 'fastapi', 'ray'] },
      { canonical: 'Math & Evaluation', synonyms: ['linear algebra', 'probability', 'statistics', 'gradient descent', 'cross-validation', 'f1-score', 'auc-roc', 'bleu', 'rouge'] },
    ],
    skills: [
      { name: 'Vectorized Python & Math', task: 'Implement matrix operations, gradient descent and data cleaning pipelines' },
      { name: 'Classical ML & Cross-Validation', task: 'Train and compare baseline models with hyperparameter tuning on real data' },
      { name: 'Deep Learning with PyTorch', task: 'Build custom neural architectures with training loops and GPU acceleration' },
      { name: 'Transformers & HuggingFace', task: 'Fine-tune transformer models for domain classification and token extraction' },
      { name: 'Production RAG & Vector DBs', task: 'Build hybrid search RAG pipeline with reranking and automated evaluation' },
      { name: 'MLOps & Model Serving', task: 'Deploy quantized models behind streaming FastAPI endpoints in Docker' },
    ],
  },
  {
    id: 'data',
    label: 'Data Scientist / Analyst',
    clusters: [
      { canonical: 'SQL & Data Warehouses', synonyms: ['sql', 'postgresql', 'bigquery', 'snowflake', 'redshift', 'window functions', 'ctes', 'dbt'] },
      { canonical: 'Python / R Analytics', synonyms: ['python', 'pandas', 'numpy', 'jupyter', 'scipy', 'r'] },
      { canonical: 'BI & Dashboards', synonyms: ['tableau', 'power bi', 'looker', 'metabase', 'excel', 'data storytelling'] },
      { canonical: 'Statistical Rigor', synonyms: ['a/b testing', 'hypothesis testing', 'experimentation', 'regression', 'correlation', 'p-value', 'power analysis'] },
      { canonical: 'ETL & Pipelines', synonyms: ['airflow', 'etl', 'elt', 'data modeling', 'spark', 'data pipelines'] },
    ],
    skills: [
      { name: 'Advanced SQL & Window Functions', task: 'Write complex cohort retention, recursive and analytical queries' },
      { name: 'Exploratory Data Analysis (EDA)', task: 'Uncover patterns, anomalies and drivers in messy business datasets' },
      { name: 'Hypothesis Testing & A/B Design', task: 'Calculate sample sizes, verify test assumptions and compute p-values' },
      { name: 'Predictive Modeling & Churn Analysis', task: 'Train XGBoost/LightGBM models and interpret feature importance via SHAP' },
      { name: 'Executive BI Dashboard', task: 'Build an interactive dashboard communicating actionable ROI insights' },
      { name: 'Data Pipeline (dbt & Warehouse)', task: 'Model raw transaction data into clean dimensional analytics tables' },
    ],
  },
  {
    id: 'pm',
    label: 'Product Manager',
    clusters: [
      { canonical: 'Product Discovery & Research', synonyms: ['user research', 'customer discovery', 'interviews', 'usability testing', 'personas', 'jobs to be done', 'jtbd'] },
      { canonical: 'Strategy & Prioritization', synonyms: ['product strategy', 'roadmap', 'rice', 'kano', 'okrs', 'kpis', 'north star metric', 'vision'] },
      { canonical: 'Execution & Agile', synonyms: ['prd', 'product requirements', 'user stories', 'agile', 'scrum', 'jira', 'backlog grooming', 'sprint planning'] },
      { canonical: 'Analytics & Growth', synonyms: ['a/b testing', 'amplitude', 'mixpanel', 'funnel analysis', 'cohort retention', 'unit economics', 'cac', 'ltv', 'churn'] },
      { canonical: 'Go-to-Market', synonyms: ['gtm', 'product launch', 'stakeholder management', 'competitive analysis', 'positioning'] },
    ],
    skills: [
      { name: 'Customer Problem Discovery', task: 'Conduct 5 user discovery interviews using The Mom Test principles' },
      { name: 'Metrics Hierarchy & North Star', task: 'Construct North Star and guardrail metric trees for everyday services' },
      { name: 'Engineering-Ready PRDs', task: 'Write detailed PRDs with edge cases, telemetry specs and acceptance criteria' },
      { name: 'Backlog Prioritization (RICE/Kano)', task: 'Evaluate competing feature initiatives with transparent scoring matrices' },
      { name: 'A/B Testing & Funnel Diagnostics', task: 'Diagnose conversion drops and design validated experimentation loops' },
      { name: 'Go-To-Market & Launch Rings', task: 'Plan beta rollouts, risk mitigation and feedback instrumentation' },
    ],
  },
  {
    id: 'design',
    label: 'UI/UX Designer',
    clusters: [
      { canonical: 'UI Design & Systems', synonyms: ['figma', 'auto-layout', 'design system', 'tokens', 'components', 'responsive design', 'typography', 'color theory'] },
      { canonical: 'UX Architecture', synonyms: ['wireframing', 'user flows', 'information architecture', 'journey mapping', 'interaction design', 'lo-fi prototypes'] },
      { canonical: 'Research & Validation', synonyms: ['user research', 'usability testing', 'heuristics', 'heuristic evaluation', 'card sorting', 'interviews'] },
      { canonical: 'Prototyping & Motion', synonyms: ['prototyping', 'micro-interactions', 'interactive prototype', 'framer', 'lottie'] },
      { canonical: 'Design Standards', synonyms: ['accessibility', 'wcag', 'inclusive design', 'handoff', 'design documentation'] },
    ],
    skills: [
      { name: 'Figma Auto-Layout & Design Tokens', task: 'Build responsive design components with variable color/typography tokens' },
      { name: 'UX Flows & Heuristic Audit', task: 'Map complete user journey and evaluate against Nielsen Norman heuristics' },
      { name: 'Usability Testing & Iteration', task: 'Facilitate 5 recorded usability tests on interactive prototypes' },
      { name: 'Web SaaS Flagship Case Study', task: 'Document problem framing, iterations, accessibility and measurable outcomes' },
      { name: 'Mobile Interaction & Micro-Animations', task: 'Design fluid mobile gestures, state transitions and micro-interactions' },
      { name: 'Developer Handoff Specs', task: 'Document edge cases, responsive states and token specs for engineering' },
    ],
  },
  {
    id: 'abroad',
    label: 'Study Abroad / Scholarship',
    clusters: [
      { canonical: 'Academic Excellence', synonyms: ['gpa', 'bachelor', 'master', 'thesis', 'honors', 'dean\'s list', 'valedictorian'] },
      { canonical: 'Language Credentials', synonyms: ['ielts', 'toefl', 'gre', 'gmat', 'sat', 'c1', 'c2'] },
      { canonical: 'Research & Publications', synonyms: ['research', 'publication', 'conference', 'ieee', 'paper', 'journal', 'abstract', 'lab assistant'] },
      { canonical: 'Leadership & Extracurriculars', synonyms: ['leadership', 'founder', 'president', 'initiative', 'club', 'organizer', 'volunteering', 'community impact'] },
      { canonical: 'Funding & Awards', synonyms: ['scholarship', 'grant', 'fellowship', 'fulbright', 'chevening', 'daad', 'erasmus', 'el-yurt umidi', 'hackathon winner'] },
    ],
    skills: [
      { name: 'Target Program & Grant Matrix', task: 'Shortlist 8 fully-funded programs aligning with your academic trajectory' },
      { name: 'IELTS / TOEFL Target Score (7.5+)', task: 'Execute 8-week diagnostic practice plan to hit C1 academic proficiency' },
      { name: 'Academic Curriculum Vitae', task: 'Format standard European or US 2-page CV highlighting quantified impact' },
      { name: 'Personal Statement Narrative Arc', task: 'Draft personal statement connecting home country needs with your degree' },
      { name: 'Study Objective & Research Proposal', task: 'Formulate rigorous research questions aligning with faculty publications' },
      { name: 'Selection Committee Mock Defense', task: 'Simulate high-stakes panel interview with an alumnus of the exact grant' },
    ],
  },
];

const ACTION_VERBS = new Set([
  'built', 'developed', 'designed', 'led', 'launched', 'created', 'implemented', 'improved', 'increased',
  'reduced', 'optimized', 'managed', 'delivered', 'analyzed', 'automated', 'founded', 'organized',
  'trained', 'deployed', 'researched', 'achieved', 'won', 'mentored', 'wrote', 'shipped', 'architected',
  'spearheaded', 'orchestrated', 'engineered', 'formulated', 'streamlined', 'scaled', 'refactored',
  'authored', 'devised', 'pioneered', 'consolidated', 'negotiated', 'boosted', 'accelerated',
]);

const WEAK_PHRASES = [
  'responsible for', 'worked on', 'helped with', 'duties included', 'tasked with', 'participated in',
  'hard-working', 'hardworking', 'team player', 'good communication', 'fast learner', 'detail-oriented',
  'self-motivated', 'punctual', 'dynamic', 'go-getter', 'strategic thinker',
];

export interface BulletAudit {
  raw: string;
  wordCount: number;
  hasActionVerb: boolean;
  actionVerb: string | null;
  hasMetric: boolean;
  metricSnippet: string | null;
  hasTaskContext: boolean;
  isTooShort: boolean;
  isTooLong: boolean;
  xyzScore: number;
  feedback: string[];
}

export interface BenchmarkReport {
  overallScore: number;
  tier: 'Excellent' | 'Competitive' | 'Needs Improvement' | 'Critical Gaps';
  seniority: SeniorityLevel;
  dimensions: {
    impact: { score: number; max: number; weight: number; description: string };
    competency: { score: number; max: number; weight: number; description: string };
    structure: { score: number; max: number; weight: number; description: string };
    brevity: { score: number; max: number; weight: number; description: string };
  };
  bulletAudits: BulletAudit[];
  matchedClusters: { name: string; foundKeyword: string }[];
  missingClusters: string[];
  findings: { level: 'good' | 'warn' | 'bad'; category: string; text: string }[];
  wordCount: number;
  bulletCount: number;
}

function analyzeResumeWithBenchmark(
  text: string,
  role: RoleSpec,
  seniority: SeniorityLevel
): BenchmarkReport {
  const lower = text.toLowerCase();
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const bulletCandidates = rawLines.filter((l) => {
    return (
      /^[-*•–—]|^\d+\./.test(l) ||
      (l.length > 25 && l.length < 240 && /^[A-Z]/.test(l) && !/:$/.test(l))
    );
  });

  const bulletLines = bulletCandidates.length > 0 ? bulletCandidates : rawLines.filter((l) => l.length > 30);

  const bulletAudits: BulletAudit[] = [];
  let xyzSum = 0;
  const findings: { level: 'good' | 'warn' | 'bad'; category: string; text: string }[] = [];

  const metricRegex = /(?:\$|€|£|\bUZS\b)?\s*\d+(?:[.,]\d+)?\s*(?:%|x|k|m|b|ms|s|hours|users|req\/s|gb|tb|pts)?/i;

  bulletLines.forEach((line) => {
    const clean = line.replace(/^[-*•–—\d.]+\s*/, '').trim();
    if (clean.length < 10) return;

    const bWords = clean.split(/\s+/);
    const firstWord = (bWords[0] || '').toLowerCase().replace(/[^a-z]/g, '');

    const hasActionVerb = ACTION_VERBS.has(firstWord);
    const actionVerb = hasActionVerb ? firstWord : null;

    const metricMatch = clean.match(metricRegex);
    const hasMetric = Boolean(metricMatch && /\d/.test(metricMatch[0]));
    const metricSnippet = hasMetric && metricMatch ? metricMatch[0].trim() : null;

    const hasTaskContext = clean.length > 25;
    const isTooShort = bWords.length < 8;
    const isTooLong = bWords.length > 45;

    let bScore = 0;
    const bFeedback: string[] = [];

    if (hasActionVerb) {
      bScore += 35;
    } else {
      bFeedback.push(`Start with a strong active verb instead of "${firstWord || 'word'}" (e.g., Spearheaded, Engineered, Optimized)`);
    }

    if (hasMetric) {
      bScore += 45;
    } else {
      bFeedback.push('Add measurable outcome (e.g., "reducing latency by 35%" or "serving 1,500 active users")');
    }

    if (hasTaskContext && !isTooShort && !isTooLong) {
      bScore += 20;
    } else if (isTooShort) {
      bFeedback.push('Bullet is too brief. Explain the method and business context.');
    } else if (isTooLong) {
      bFeedback.push('Bullet is a run-on sentence. Split into concise 1–2 line outcomes.');
    }

    xyzSum += bScore;
    bulletAudits.push({
      raw: clean,
      wordCount: bWords.length,
      hasActionVerb,
      actionVerb,
      hasMetric,
      metricSnippet,
      hasTaskContext,
      isTooShort,
      isTooLong,
      xyzScore: bScore,
      feedback: bFeedback,
    });
  });

  const parsedBulletCount = bulletAudits.length;
  const avgXyzScore = parsedBulletCount > 0 ? xyzSum / parsedBulletCount : 30;

  let impactScore = 0;
  const metricBulletsCount = bulletAudits.filter((b) => b.hasMetric).length;

  if (seniority === 'student') {
    impactScore = Math.min(30, Math.round((avgXyzScore / 100) * 18 + Math.min(metricBulletsCount, 3) * 4));
  } else if (seniority === 'junior') {
    impactScore = Math.min(30, Math.round((avgXyzScore / 100) * 16 + Math.min(metricBulletsCount, 4) * 3.5));
  } else {
    impactScore = Math.min(30, Math.round((avgXyzScore / 100) * 14 + Math.min(metricBulletsCount, 5) * 3.2));
  }

  if (metricBulletsCount >= (seniority === 'student' ? 2 : 4)) {
    findings.push({
      level: 'good',
      category: 'Impact',
      text: `Strong quantified impact: ${metricBulletsCount} accomplishments backed by measurable numbers.`,
    });
  } else {
    findings.push({
      level: seniority === 'student' ? 'warn' : 'bad',
      category: 'Impact',
      text: `Low quantified achievements (${metricBulletsCount} found). Google XYZ formula requires measuring outcome [Y] (%, time, users).`,
    });
  }

  const matchedClusters: { name: string; foundKeyword: string }[] = [];
  const missingClusters: string[] = [];

  role.clusters.forEach((cluster) => {
    const matchedSynonym = cluster.synonyms.find((syn) => {
      const reg = new RegExp(`(^|[^a-z0-9])${syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      return reg.test(lower);
    });

    if (matchedSynonym) {
      matchedClusters.push({ name: cluster.canonical, foundKeyword: matchedSynonym });
    } else {
      missingClusters.push(cluster.canonical);
    }
  });

  const clusterRatio = matchedClusters.length / role.clusters.length;
  const competencyScore = Math.min(30, Math.round(clusterRatio * 30));

  if (clusterRatio >= 0.75) {
    findings.push({
      level: 'good',
      category: 'Competencies',
      text: `Excellent skill depth: covered ${matchedClusters.length} of ${role.clusters.length} core knowledge clusters for ${role.label}.`,
    });
  } else if (clusterRatio >= 0.5) {
    findings.push({
      level: 'warn',
      category: 'Competencies',
      text: `Moderate keyword presence (${matchedClusters.length}/${role.clusters.length}). Missing clusters: ${missingClusters.slice(0, 3).join(', ')}.`,
    });
  } else {
    findings.push({
      level: 'bad',
      category: 'Competencies',
      text: `Major skill gaps for ATS screening: missing essential competencies in ${missingClusters.join(', ')}.`,
    });
  }

  let structureScore = 0;
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text);
  const hasPhone = /(\+?\d[\d\s().-]{8,}\d)/.test(text);
  const hasLinkedin = /linkedin\.com/i.test(lower);
  const hasGithub = /(github\.com|gitlab\.com|behance\.net|dribbble\.com|portfolio)/i.test(lower);

  const contactPts = (hasEmail ? 3 : 0) + (hasPhone ? 2 : 0) + (hasLinkedin ? 3 : 0) + (hasGithub ? 2 : 0);
  structureScore += contactPts;

  if (!hasEmail) findings.push({ level: 'bad', category: 'Structure', text: 'No email address detected. Recruiters cannot reach you.' });
  if (!hasLinkedin) findings.push({ level: 'warn', category: 'Structure', text: 'Missing LinkedIn profile link. 87% of tech recruiters cross-reference LinkedIn.' });
  if (!hasGithub && role.id !== 'abroad') findings.push({ level: 'warn', category: 'Structure', text: 'Add a verified GitHub / portfolio link to substantiate your projects.' });

  const sections: [string, RegExp][] = [
    ['Experience / Projects', /\b(experience|work history|employment|projects|project experience)\b/i],
    ['Education', /\b(education|university|degree|academic)\b/i],
    ['Technical Skills', /\b(skills|technical skills|technologies|tech stack|competencies)\b/i],
  ];
  const detectedSections = sections.filter(([, re]) => re.test(lower));
  structureScore += detectedSections.length * 3;

  if (detectedSections.length < sections.length) {
    const missingSec = sections.filter(([, re]) => !re.test(lower)).map(([n]) => n);
    findings.push({ level: 'warn', category: 'Structure', text: `Missing expected structural sections: ${missingSec.join(', ')}.` });
  }

  const [minWords, maxWords] =
    seniority === 'student' ? [200, 550] : seniority === 'junior' ? [300, 750] : [450, 950];

  if (wordCount >= minWords && wordCount <= maxWords) {
    structureScore += 5;
    findings.push({ level: 'good', category: 'Structure', text: `Optimal page length for ${seniority.toUpperCase()} profile (${wordCount} words).` });
  } else if (wordCount < minWords) {
    structureScore += Math.max(1, Math.round((wordCount / minWords) * 3));
    findings.push({ level: 'warn', category: 'Structure', text: `Resume is lean (${wordCount} words). Add detailed project deliverables to demonstrate depth.` });
  } else {
    structureScore += 3;
    findings.push({ level: 'warn', category: 'Structure', text: `Resume is lengthy (${wordCount} words). High-performing resumes stay within 1–2 concise pages.` });
  }

  let brevityScore = 15;
  const weakHits = WEAK_PHRASES.filter((phrase) => lower.includes(phrase));
  const weakPenalty = Math.min(6, weakHits.length * 2);
  brevityScore -= weakPenalty;

  if (weakHits.length > 0) {
    findings.push({
      level: 'warn',
      category: 'Voice',
      text: `Found ${weakHits.length} passive clichés (${weakHits.slice(0, 3).map((w) => `"${w}"`).join(', ')}). Replace with concrete accomplishments.`,
    });
  } else {
    findings.push({
      level: 'good',
      category: 'Voice',
      text: 'Strong professional tone: free from generic filler clichés.',
    });
  }

  const totalScore = Math.min(100, Math.max(10, impactScore + competencyScore + structureScore + brevityScore));

  let tier: BenchmarkReport['tier'] = 'Critical Gaps';
  if (totalScore >= 82) tier = 'Excellent';
  else if (totalScore >= 68) tier = 'Competitive';
  else if (totalScore >= 50) tier = 'Needs Improvement';

  return {
    overallScore: totalScore,
    tier,
    seniority,
    dimensions: {
      impact: {
        score: impactScore,
        max: 30,
        weight: 30,
        description: 'Google XYZ Formula (Action Verb + Quantified Metrics)',
      },
      competency: {
        score: competencyScore,
        max: 30,
        weight: 30,
        description: 'Role-Specific Tech & Competency Synonym Clusters',
      },
      structure: {
        score: structureScore,
        max: 25,
        weight: 25,
        description: 'ATS Parseability, Contact Links & Optimal Length',
      },
      brevity: {
        score: brevityScore,
        max: 15,
        weight: 15,
        description: 'Action Voice & Zero Fluff / Clichés',
      },
    },
    bulletAudits: bulletAudits.slice(0, 8),
    matchedClusters,
    missingClusters,
    findings,
    wordCount,
    bulletCount: parsedBulletCount,
  };
}

// ============================================================================
// REAL, FAIR, DETAILED ROADMAP CURRICULUM ENGINE
// ============================================================================

export type RoadmapLevel = 'beginner' | 'intermediate' | 'advanced';
export type WeeklyCommitment = 'part_time' | 'full_time';

export interface RoadmapResource {
  name: string;
  provider: string;
  type: 'Curriculum' | 'Interactive' | 'Documentation' | 'Practice' | 'Playbook' | 'Official Portal';
}

export interface DetailedWeekMilestone {
  weekNum: number;
  phaseId: 1 | 2 | 3 | 4;
  phaseTitle: string;
  title: string;
  focusArea: string;
  objective: string;
  deliverable: string;
  estimatedHours: number;
  resources: RoadmapResource[];
  tasks: { id: string; label: string; detail: string }[];
  mentorAdvice: string;
}

interface CurriculumTemplate {
  phases: { id: 1 | 2 | 3 | 4; title: string; badge: string; description: string }[];
  weeks: {
    phaseId: 1 | 2 | 3 | 4;
    title: string;
    focusArea: string;
    objective: string;
    deliverable: string;
    resources: RoadmapResource[];
    tasks: { label: string; detail: string }[];
    mentorAdvice: string;
  }[];
}

const CURRICULUM_DATA: Record<RoleId, CurriculumTemplate> = {
  swe: {
    phases: [
      { id: 1, title: 'Systems Rigor & Algorithmic Patterns', badge: 'FOUNDATIONS', description: 'Core Linux tooling, modern TypeScript/Go syntax, and high-frequency algorithm patterns.' },
      { id: 2, title: 'Scalable Backends, APIs & Database Engineering', badge: 'ARCHITECTURE', description: 'PostgreSQL schema optimization, REST/gRPC API contracts, and caching mechanics.' },
      { id: 3, title: 'Production Capstone with Quantified Scale', badge: 'CAPSTONE', description: 'Build and deploy a full-stack distributed system with live performance benchmarks.' },
      { id: 4, title: 'System Design Defense & Google XYZ Resume', badge: 'INTERVIEWS', description: 'Master distributed system trade-offs and simulate live technical interviews.' },
    ],
    weeks: [
      {
        phaseId: 1,
        title: 'Linux Shell, Git Internals & Modern Typing',
        focusArea: 'Engineering Environment',
        objective: 'Master terminal-first development, advanced Git branching (rebase, bisect) and strict type systems.',
        deliverable: 'Configure automated dotfiles and create a typed CLI tool published to GitHub with CI.',
        resources: [
          { name: 'The Missing Semester of Your CS Education', provider: 'MIT CSAIL', type: 'Curriculum' },
          { name: 'TypeScript Handbook & Deep Dive', provider: 'Microsoft', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Set up SSH keys, Zsh/Bash aliases and Git signing', detail: 'Ensure clean GPG verification on GitHub' },
          { label: 'Write a TypeScript CLI with argument parsing and strict types', detail: 'Publish to GitHub with automated test runner' },
          { label: 'Practice Git interactive rebase and semantic commit conventions', detail: 'Simulate resolving multi-branch merge conflicts' },
        ],
        mentorAdvice: 'Top engineering teams assess how comfortable you are in the terminal. Do not rely on GUI tools for core Git operations.',
      },
      {
        phaseId: 1,
        title: 'Data Structures & Algorithmic Problem Solving',
        focusArea: 'Core Algorithms',
        objective: 'Internalize Two Pointers, Sliding Window, Hash Maps, and Binary Search patterns on LeetCode.',
        deliverable: 'Solve 20 pattern-based problems with written time/space complexity analyses in a public repository.',
        resources: [
          { name: 'NeetCode 150 Core Patterns', provider: 'NeetCode', type: 'Interactive' },
          { name: 'Algorithms, 4th Edition', provider: 'Princeton University', type: 'Curriculum' },
        ],
        tasks: [
          { label: 'Solve 6 Two-Pointer and Sliding Window problems (e.g., 3Sum, Min Window Substring)', detail: 'Document edge cases and invariant rules' },
          { label: 'Implement Binary Search variations (finding boundary conditions)', detail: 'Explain O(log n) proof for each variation' },
          { label: 'Time-box each problem to 25 minutes without looking at solutions', detail: 'Conduct personal post-mortem on missed patterns' },
        ],
        mentorAdvice: 'Do not memorize code. Memorize the invariant: what condition remains true as your pointers shift across the array?',
      },
      {
        phaseId: 2,
        title: 'PostgreSQL Schema Design, Indexing & Transactions',
        focusArea: 'Databases & Storage',
        objective: 'Design 3rd Normal Form schemas, analyze B-tree query execution plans, and handle ACID transactions.',
        deliverable: 'Deploy a PostgreSQL database on Railway with automated migrations, indexes, and EXPLAIN ANALYZE reports.',
        resources: [
          { name: 'Use The Index, Luke!', provider: 'Markus Winand', type: 'Documentation' },
          { name: 'PostgreSQL Official Documentation', provider: 'PostgreSQL Global Group', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Design an e-commerce or booking schema with foreign keys and check constraints', detail: 'Prevent duplicate bookings via unique constraints' },
          { label: 'Write complex JOINs and benchmark queries with and without composite indexes', detail: 'Measure execution time drop via EXPLAIN ANALYZE' },
          { label: 'Implement transactional balance transfers with row-level locks (SELECT FOR UPDATE)', detail: 'Verify zero double-spending under concurrent requests' },
        ],
        mentorAdvice: 'Junior engineers just query tables. Senior engineers look at the query plan. Always explain why you chose a B-tree or Hash index.',
      },
      {
        phaseId: 2,
        title: 'Production REST & gRPC API Architecture',
        focusArea: 'Backend Engineering',
        objective: 'Construct structured, resilient APIs with validation, rate limiting, and JWT authentication.',
        deliverable: 'Ship a containerized REST/gRPC service with Swagger/OpenAPI docs and unit test coverage >80%.',
        resources: [
          { name: 'Full Stack Open — Node & Express / GraphQL', provider: 'University of Helsinki', type: 'Curriculum' },
          { name: 'Twelve-Factor App Methodology', provider: 'Heroku Engineering', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Build structured API routes with zod/pydantic request validation', detail: 'Return standardized error envelopes with HTTP status codes' },
          { label: 'Integrate Redis-backed token bucket rate limiter to prevent abuse', detail: 'Cap traffic at 60 requests per minute per IP' },
          { label: 'Write end-to-end integration tests using Vitest / Jest / Pytest', detail: 'Validate auth flows and edge cases' },
        ],
        mentorAdvice: 'Never expose raw database errors to the client. Build clean centralized error handling middleware on Day 1.',
      },
      {
        phaseId: 2,
        title: 'Asynchronous Queues & Cache-Aside Mechanics',
        focusArea: 'Distributed Basics',
        objective: 'Decouple long-running operations using Redis and background message workers.',
        deliverable: 'Implement a background notification/PDF export worker with exponential backoff retries.',
        resources: [
          { name: 'Designing Data-Intensive Applications (Chapters 3 & 11)', provider: 'Martin Kleppmann', type: 'Curriculum' },
          { name: 'Redis Documentation on Caching Strategies', provider: 'Redis Labs', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Implement Redis Cache-Aside pattern with TTL expiration', detail: 'Prevent cache stampedes using distributed locks' },
          { label: 'Set up BullMQ / Celery worker queue for background job dispatch', detail: 'Handle failed jobs with dead-letter queue routing' },
          { label: 'Instrument telemetry with structured logs and latency tracking', detail: 'Log execution time per background task' },
        ],
        mentorAdvice: 'When a mentor asks how you scale an API, your first instinct should be caching read-heavy endpoints and offloading writes to queues.',
      },
      {
        phaseId: 3,
        title: 'Production Capstone: Architecture & Database Modeling',
        focusArea: 'Capstone Project',
        objective: 'Design a high-scale real-time collaborative workspace, payment gateway, or analytics ingestion engine.',
        deliverable: 'Publish an Architecture Decision Record (ADR) and initialized repository with Docker Compose.',
        resources: [
          { name: 'Software Architecture Patterns', provider: 'O\'Reilly Media', type: 'Playbook' },
          { name: 'System Design Primer', provider: 'Donne Martin', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Draft System Architecture Diagram and database ERD', detail: 'Identify potential bottlenecks and scaling boundaries' },
          { label: 'Configure multi-container Docker Compose with App, Postgres and Redis', detail: 'Ensure zero hardcoded configuration secrets' },
          { label: 'Set up GitHub Actions CI workflow to run linters and tests on every PR', detail: 'Block merges if tests fail' },
        ],
        mentorAdvice: 'A real capstone has trade-offs documented in the README. Write why you chose PostgreSQL over MongoDB.',
      },
      {
        phaseId: 3,
        title: 'Capstone Implementation & Frontend Integration',
        focusArea: 'Full-Stack Delivery',
        objective: 'Build an intuitive, responsive frontend with optimistic UI updates and complete type safety.',
        deliverable: 'Complete end-to-end user workflows with live responsive UI deployed on Vercel / Cloudflare.',
        resources: [
          { name: 'Next.js 15 App Router & Server Actions Guide', provider: 'Vercel', type: 'Documentation' },
          { name: 'Web Content Accessibility Guidelines (WCAG 2.1)', provider: 'W3C', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Implement optimistic UI updates for instant perceived latency', detail: 'Revert state gracefully if the backend request rejects' },
          { label: 'Ensure keyboard accessibility, focus rings, and screen-reader tags', detail: 'Pass Lighthouse Accessibility audit with score >90' },
          { label: 'Deploy application with custom domain and SSL certificates', detail: 'Verify zero production console errors' },
        ],
        mentorAdvice: 'Hiring managers test edge cases: try submitting empty forms, cutting wifi, and sending invalid tokens. Make sure UI never crashes.',
      },
      {
        phaseId: 3,
        title: 'Performance Benchmarking & k6 Load Testing',
        focusArea: 'Production Hardening',
        objective: 'Simulate high concurrent user traffic and optimize latency under load.',
        deliverable: 'k6 load test report showing sub-60ms p95 latency under 1,000 requests per second.',
        resources: [
          { name: 'k6 Load Testing Documentation', provider: 'Grafana Labs', type: 'Documentation' },
          { name: 'High Performance Browser Networking', provider: 'Ilya Grigorik', type: 'Curriculum' },
        ],
        tasks: [
          { label: 'Write k6 load test script simulating 500 concurrent virtual users', detail: 'Identify endpoint bottlenecks under sustained traffic' },
          { label: 'Tune PostgreSQL connection pooling and add missing partial indexes', detail: 'Measure p95 latency improvement before vs after' },
          { label: 'Embed load test performance graph directly in project README', detail: 'Provides instant proof of engineering rigor to recruiters' },
        ],
        mentorAdvice: 'This single load testing graph in your GitHub README separates you from 95% of generic boot camp graduates.',
      },
      {
        phaseId: 4,
        title: 'Distributed System Design Patterns',
        focusArea: 'System Design',
        objective: 'Master load balancers, database sharding, consistency models, and rate limiting architectures.',
        deliverable: 'Whiteboard design diagrams for a Scalable URL Shortener, Web Crawler, and Real-time Chat service.',
        resources: [
          { name: 'Grokking the System Design Interview', provider: 'Design Gurus', type: 'Curriculum' },
          { name: 'ByteByteGo System Design Newsletter', provider: 'Alex Xu', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Design a URL shortener handling 100M daily writes with base62 encoding', detail: 'Calculate storage, bandwidth, and cache requirements' },
          { label: 'Compare Strong Consistency vs Eventual Consistency trade-offs', detail: 'Apply PACELC theorem to real architectural decisions' },
          { label: 'Practice drawing clear architectural boundaries on Excalidraw', detail: 'Structure diagrams with clear protocol arrows and state stores' },
        ],
        mentorAdvice: 'In system design interviews, start with scale calculations: daily active users, writes per second, storage over 5 years. Then design.',
      },
      {
        phaseId: 4,
        title: 'Google XYZ Resume Overhaul & LinkedIn Alignment',
        focusArea: 'Career Packaging',
        objective: 'Rewrite every bullet point using Google XYZ: [Accomplished X] as measured by [Y], by doing [Z].',
        deliverable: 'Upload updated PDF to MyRahnamo AI Resume Checker and achieve a Fair Benchmark Score >85/100.',
        resources: [
          { name: 'Google Recruiter Resume Guide', provider: 'Google Careers', type: 'Playbook' },
          { name: 'MyRahnamo Google XYZ Checker', provider: 'MyRahnamo', type: 'Interactive' },
        ],
        tasks: [
          { label: 'Transform project bullets into quantified outcomes with metrics', detail: 'Example: "Engineered Redis caching layer reducing p95 latency by 42%"' },
          { label: 'Verify ATS compliance: 1 column, clean fonts, contact links, zero fluff', detail: 'Confirm 100% parseability in our AI scanner' },
          { label: 'Synchronize headline and projects on LinkedIn with GitHub live links', detail: 'Include direct repository URLs and production links' },
        ],
        mentorAdvice: 'If a bullet does not have a number or percentage, rewrite it. Numbers anchor your competence in reality.',
      },
      {
        phaseId: 4,
        title: '1:1 Technical Mock Interview & Direct Applications',
        focusArea: 'Interview Execution',
        objective: 'Conduct a simulated 60-minute technical interview with a verified senior software engineer.',
        deliverable: 'Pass mock coding + system design defense and submit applications to 10 verified opportunities.',
        resources: [
          { name: 'Tech Interview Handbook', provider: 'Yangshun Tay', type: 'Playbook' },
          { name: 'MyRahnamo 1:1 Senior SWE Mentors', provider: 'MyRahnamo', type: 'Interactive' },
        ],
        tasks: [
          { label: 'Book 1:1 Mock Interview with a verified Rahnamo from FAANG / Uzum / EPAM', detail: 'Receive written diagnostic on coding speed and communication' },
          { label: 'Rehearse your 90-second engineering elevator pitch and behavioral stories', detail: 'Follow STAR framework (Situation, Task, Action, Result)' },
          { label: 'Submit tailored applications to 10 curated tech companies or internships', detail: 'Track submissions and follow up with engineering managers on LinkedIn' },
        ],
        mentorAdvice: 'Treat mock interviews as real high-stakes dry runs. Record your audio and listen back to eliminate filler words ("um", "like").',
      },
    ],
  },
  ai: {
    phases: [
      { id: 1, title: 'Mathematical Foundations & Vectorized Python', badge: 'FOUNDATIONS', description: 'Linear algebra, autograd, PyTorch tensor mechanics, and classical machine learning.' },
      { id: 2, title: 'Transformers, Embeddings & Production RAG', badge: 'DEEP LEARNING', description: 'Attention mechanisms, HuggingFace ecosystem, vector databases, and hybrid search pipelines.' },
      { id: 3, title: 'Autonomous AI Agent Capstone with Live Evaluation', badge: 'CAPSTONE', description: 'Build and deploy a production GenAI assistant with Ragas evaluation metrics.' },
      { id: 4, title: 'ML System Design & Technical Defense', badge: 'INTERVIEWS', description: 'Latency vs accuracy trade-offs, model serving architectures, and portfolio defense.' },
    ],
    weeks: [
      {
        phaseId: 1,
        title: 'Vectorized Mathematics & Tensor Operations in PyTorch',
        focusArea: 'Math & Tensors',
        objective: 'Understand gradient descent, matrix factorizations, and implement autograd from scratch.',
        deliverable: 'Implement a two-layer neural network from scratch using only NumPy and PyTorch tensors.',
        resources: [
          { name: 'Practical Deep Learning for Coders', provider: 'Fast.ai', type: 'Curriculum' },
          { name: '3Blue1Brown Neural Networks & Linear Algebra', provider: 'Grant Sanderson', type: 'Curriculum' },
        ],
        tasks: [
          { label: 'Implement forward pass, loss calculation and backpropagation manually', detail: 'Verify gradients match torch.autograd exactly' },
          { label: 'Benchmark matrix multiplication on CPU vs GPU tensors', detail: 'Measure speedup under various tensor dimensions' },
          { label: 'Implement cross-entropy loss and softmax with numerical stability', detail: 'Prevent log(0) overflow issues' },
        ],
        mentorAdvice: 'Do not just import high-level libraries. When interviewers ask about vanishing gradients, you must explain the chain rule calculus.',
      },
      {
        phaseId: 1,
        title: 'Classical Machine Learning & Validation Rigor',
        focusArea: 'Applied ML',
        objective: 'Master tabular data pipelines, cross-validation, hyperparameter tuning, and ROC-AUC metrics.',
        deliverable: 'Publish a Kaggle notebook achieving top 15% on a real tabular classification challenge.',
        resources: [
          { name: 'StatQuest Machine Learning Course', provider: 'Josh Starmer', type: 'Curriculum' },
          { name: 'Scikit-Learn User Guide', provider: 'Scikit-Learn Community', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Engineer domain-specific features and handle missing data rigorously', detail: 'Avoid data leakage between train and validation splits' },
          { label: 'Train and compare Logistic Regression, Random Forests, and XGBoost', detail: 'Use stratified k-fold cross-validation' },
          { label: 'Interpret feature importance using SHAP values', detail: 'Explain predictions to non-technical stakeholders' },
        ],
        mentorAdvice: 'In 80% of business problems, gradient boosted trees outperform deep neural nets. Understand when NOT to use deep learning.',
      },
      {
        phaseId: 2,
        title: 'Attention Mechanisms & Transformer Architectures',
        focusArea: 'Transformers & NLP',
        objective: 'Understand self-attention, multi-head attention, positional encoding, and tokenization.',
        deliverable: 'Implement a self-attention module and inspect attention weight heatmaps on sample text.',
        resources: [
          { name: 'The Illustrated Transformer', provider: 'Jay Alammar', type: 'Playbook' },
          { name: 'Hugging Face NLP Course', provider: 'Hugging Face', type: 'Curriculum' },
        ],
        tasks: [
          { label: 'Calculate scaled dot-product attention step by step in PyTorch', detail: 'Compute Q, K, V matrix projections with masking' },
          { label: 'Tokenize custom multilingual corpora using byte-pair encoding (BPE)', detail: 'Analyze token fragmentation in Uzbek and Russian' },
          { label: 'Fine-tune a lightweight transformer for text classification', detail: 'Log training metrics with Weights & Biases (W&B)' },
        ],
        mentorAdvice: 'Tokenization is the root cause of many LLM failures. Always inspect how your model tokenizes numbers and regional languages.',
      },
      {
        phaseId: 2,
        title: 'Production RAG Architectures & Vector Search',
        focusArea: 'Retrieval Systems',
        objective: 'Build enterprise retrieval-augmented generation pipelines with vector indexing and reranking.',
        deliverable: 'Deploy a hybrid search RAG pipeline combining BM25 keyword matching with pgvector embeddings.',
        resources: [
          { name: 'Building Production RAG Systems', provider: 'DeepLearning.AI', type: 'Curriculum' },
          { name: 'LangChain / LlamaIndex Documentation', provider: 'Open Source', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Implement chunking strategies (recursive character vs semantic chunking)', detail: 'Analyze retrieval precision across different chunk sizes' },
          { label: 'Store and index embeddings in PostgreSQL using pgvector (HNSW index)', detail: 'Achieve sub-25ms retrieval latency' },
          { label: 'Integrate a cross-encoder reranker (e.g. bge-reranker) to re-score top-10 chunks', detail: 'Measure recall improvement on benchmark queries' },
        ],
        mentorAdvice: 'Simple vector search fails on keyword lookups (like order numbers or exact names). Production RAG always uses hybrid search + reranking.',
      },
      {
        phaseId: 3,
        title: 'Capstone: Autonomous Domain AI Assistant',
        focusArea: 'Capstone Engineering',
        objective: 'Build an autonomous agent with function calling, tool use, and structured output guarantees.',
        deliverable: 'Deploy an operational AI assistant (e.g., Legal Contract Auditor or Financial Analyst) with live API.',
        resources: [
          { name: 'Function Calling & Structured Outputs', provider: 'OpenAI / Anthropic', type: 'Documentation' },
          { name: 'FastAPI High Performance Async', provider: 'Tiangolo', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Implement function calling tools with strict Pydantic schema validation', detail: 'Allow agent to query databases and run calculations' },
          { label: 'Add streaming response generation via Server-Sent Events (SSE)', detail: 'Ensure first-token latency stays under 800ms' },
          { label: 'Containerize application with Docker and deploy to Cloud Run / GPU instance', detail: 'Configure environment variables and rate limiting' },
        ],
        mentorAdvice: 'Recruiters want to see how you handle model hallucinations and prompt injections. Build automated input sanitization.',
      },
      {
        phaseId: 3,
        title: 'Automated AI Evaluation with Ragas & DeepEval',
        focusArea: 'Model Evaluation',
        objective: 'Quantify retrieval faithfulness, answer relevance, and hallucination rates using automated eval pipelines.',
        deliverable: 'Publish an automated evaluation test suite running in GitHub Actions with target faithfulness >85%.',
        resources: [
          { name: 'Ragas Evaluation Framework', provider: 'Exploding Gradients', type: 'Documentation' },
          { name: 'DeepEval Unit Testing for LLMs', provider: 'Confident AI', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Construct a synthetic ground-truth test set of 50 challenging domain questions', detail: 'Include adversarial questions with missing context' },
          { label: 'Compute Faithfulness, Context Recall, and Answer Relevance metrics', detail: 'Plot baseline vs optimized scores' },
          { label: 'Set up automated CI gate that fails if hallucination metric exceeds 10%', detail: 'Ensure regression testing before any prompt changes' },
        ],
        mentorAdvice: 'Saying "the AI works well" means nothing. Saying "achieved 89% faithfulness on a 50-query adversarial benchmark" lands offers.',
      },
      {
        phaseId: 4,
        title: 'ML System Design & Serving at Scale',
        focusArea: 'ML System Design',
        objective: 'Master model quantization (INT8/FP16), continuous batching (vLLM), and system trade-offs.',
        deliverable: 'Produce architecture design document for an Enterprise Semantic Search & Recommendation Engine.',
        resources: [
          { name: 'Designing Machine Learning Systems', provider: 'Chip Huyen', type: 'Curriculum' },
          { name: 'vLLM Fast Inference Engine', provider: 'vLLM Project', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Design real-time video/image recommendation architecture with candidate generation', detail: 'Balance 2-stage retrieval and ranking latency' },
          { label: 'Compare local quantized model serving vs proprietary API costs', detail: 'Calculate monthly ROI at 500k monthly active users' },
          { label: 'Prepare for ML behavioral questions about model drift and data privacy', detail: 'Formulate GDPR and user data retention policies' },
        ],
        mentorAdvice: 'In ML design, always address training vs inference latency, offline batch vs online scoring, and cold-start problems.',
      },
      {
        phaseId: 4,
        title: '1:1 AI Mock Interview & Portfolio Review with a Rahnamo',
        focusArea: 'Career Launchpad',
        objective: 'Defend your AI capstone code and system design in front of a practicing AI / ML Engineer.',
        deliverable: 'Pass mock technical review and submit applications to 10 curated global AI teams and internships.',
        resources: [
          { name: 'MyRahnamo 1:1 Senior AI Mentors', provider: 'MyRahnamo', type: 'Interactive' },
          { name: 'Hugging Face Open Roles & Communities', provider: 'Hugging Face', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Conduct a 60-minute technical defense of your RAG architecture with a Rahnamo', detail: 'Demonstrate live evaluation and latency profiling' },
          { label: 'Audit your resume with Google XYZ: "Quantified 35% hallucination reduction via hybrid reranking"', detail: 'Score 85+ on MyRahnamo ATS engine' },
          { label: 'Submit applications to global AI startups and local enterprise labs', detail: 'Reach out to tech leads with personalized loom demo links' },
        ],
        mentorAdvice: 'Include a 2-minute Loom screen recording of your AI project in your job applications. Engineers love seeing working systems.',
      },
    ],
  },
  data: {
    phases: [
      { id: 1, title: 'Advanced SQL & Exploratory Analysis', badge: 'FOUNDATIONS', description: 'Window functions, CTEs, statistical summaries, and exploratory data analysis.' },
      { id: 2, title: 'Statistical Rigor & Experimentation (A/B Testing)', badge: 'EXPERIMENTATION', description: 'Hypothesis testing, causal inference, and modern data modeling with dbt.' },
      { id: 3, title: 'Commercial Data Capstone with ROI Storytelling', badge: 'CAPSTONE', description: 'Analyze real business datasets to uncover revenue leakage and build executive BI dashboards.' },
      { id: 4, title: 'Business Case Defense & Google XYZ Packaging', badge: 'INTERVIEWS', description: 'Diagnose metric drops, master North Star frameworks, and simulate live data defense.' },
    ],
    weeks: [
      {
        phaseId: 1,
        title: 'Advanced SQL: Window Functions, CTEs & Retention',
        focusArea: 'SQL Mastery',
        objective: 'Write scalable analytical SQL queries that answer complex business questions without lag.',
        deliverable: 'Solve 25 advanced LeetCode / Stratascratch SQL problems with window functions and self-joins.',
        resources: [
          { name: 'Mode Analytics Advanced SQL Tutorial', provider: 'Mode', type: 'Curriculum' },
          { name: 'LeetCode SQL 50 Study Plan', provider: 'LeetCode', type: 'Interactive' },
        ],
        tasks: [
          { label: 'Calculate 30-day user cohort retention curves using self-joins and dates', detail: 'Identify retention drop-offs over weekly cohorts' },
          { label: 'Use LEAD(), LAG(), ROW_NUMBER() and DENSE_RANK() across partitions', detail: 'Extract top-3 revenue generators per country' },
          { label: 'Write recursive CTEs to navigate organizational and transactional trees', detail: 'Optimize query execution time' },
        ],
        mentorAdvice: 'In data analyst interviews, 70% of live coding is SQL. You must write window functions instinctively without looking at syntax guides.',
      },
      {
        phaseId: 1,
        title: 'Python for Data Analysis: Pandas, Polars & Visuals',
        focusArea: 'Data Wrangling',
        objective: 'Clean, reshape, and analyze messy multi-source datasets with production Python scripts.',
        deliverable: 'Publish an exploratory data analysis (EDA) report on GitHub with clear data storytelling.',
        resources: [
          { name: 'Python for Data Analysis (3rd Edition)', provider: 'Wes McKinney', type: 'Curriculum' },
          { name: 'Seaborn & Matplotlib Visualization Guide', provider: 'Open Source', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Perform missing value imputation and outlier detection using IQR and z-scores', detail: 'Document why specific values were imputed or trimmed' },
          { label: 'Group, pivot, and merge datasets with Pandas and modern Polars', detail: 'Profile memory consumption on large CSV files' },
          { label: 'Create publication-ready visual charts communicating single clear insights', detail: 'Avoid cluttered charts; format axes cleanly' },
        ],
        mentorAdvice: 'Good charts explain themselves in 5 seconds. Label your axes, highlight the key takeaway in color, and grey out background noise.',
      },
      {
        phaseId: 2,
        title: 'Statistical Foundations & A/B Testing Design',
        focusArea: 'Experimentation',
        objective: 'Design statistically rigorous experiments, calculate sample sizes, and compute p-values.',
        deliverable: 'Write an Experimentation Brief with sample size calculation, guardrail metrics, and power analysis.',
        resources: [
          { name: 'Trustworthy Online Controlled Experiments', provider: 'Ron Kohavi (Stanford/Microsoft)', type: 'Curriculum' },
          { name: 'Evan Miller A/B Testing Calculators', provider: 'Evan Miller', type: 'Interactive' },
        ],
        tasks: [
          { label: 'Determine required sample size given baseline conversion rate and Minimum Detectable Effect (MDE)', detail: 'Calculate duration needed to reach 95% statistical power' },
          { label: 'Perform two-sample hypothesis testing (t-test and Chi-square) in Python', detail: 'Verify assumptions of normality and variance' },
          { label: 'Define primary metric vs guardrail metrics to protect user experience', detail: 'Prevent short-term revenue gains that harm retention' },
        ],
        mentorAdvice: 'Top tech companies will grill you on Sample Ratio Mismatch (SRM) and p-hacking. Never stop an A/B test early just because p < 0.05.',
      },
      {
        phaseId: 2,
        title: 'Modern Analytics Engineering with dbt & Warehouses',
        focusArea: 'Analytics Engineering',
        objective: 'Build reliable dimensional data models following star schema principles in BigQuery or Snowflake.',
        deliverable: 'Set up a dbt project transforming raw event logs into production fact and dimension tables.',
        resources: [
          { name: 'dbt Fundamentals Free Course', provider: 'dbt Labs', type: 'Curriculum' },
          { name: 'The Data Warehouse Toolkit', provider: 'Ralph Kimball', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Design dimensional models (dim_users, fct_transactions) with clean grain', detail: 'Document data dictionary for each column' },
          { label: 'Write automated dbt schema tests (unique, not_null, accepted_values)', detail: 'Prevent corrupted data from entering reporting dashboards' },
          { label: 'Generate and review dbt documentation lineage graphs', detail: 'Track data flow from staging to marts' },
        ],
        mentorAdvice: 'Analytics engineering bridges the gap between raw data and business dashboards. Learning dbt doubles your hiring value.',
      },
      {
        phaseId: 3,
        title: 'Commercial Capstone: Churn Prediction & Revenue Leakage',
        focusArea: 'Business Impact Capstone',
        objective: 'Analyze real-world customer transactions to predict churn and quantify revenue risk.',
        deliverable: 'Publish an end-to-end GitHub case study quantifying revenue impact for executive leadership.',
        resources: [
          { name: 'Kaggle Real E-commerce / Telecom Churn Datasets', provider: 'Kaggle', type: 'Interactive' },
          { name: 'SHAP (SHapley Additive exPlanations) Guide', provider: 'Scott Lundberg', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Clean and assemble customer behavioral profiles across 12 months of events', detail: 'Extract features: RFM (Recency, Frequency, Monetary)' },
          { label: 'Train and validate an XGBoost / LightGBM model with precision-recall trade-offs', detail: 'Optimize threshold for business cost of false negatives' },
          { label: 'Calculate projected savings ($/UZS) from proactive retention interventions', detail: 'Tie model predictions directly to financial balance sheet' },
        ],
        mentorAdvice: 'Executives do not care about AUC scores. They care about dollars. Translate your 0.84 AUC into "$45,000 monthly churn prevented".',
      },
      {
        phaseId: 3,
        title: 'Executive BI Dashboard & Actionable Storytelling',
        focusArea: 'Business Intelligence',
        objective: 'Build an intuitive interactive dashboard in Tableau, Power BI, or Streamlit.',
        deliverable: 'Shareable live dashboard with drill-down filters and clear executive action recommendations.',
        resources: [
          { name: 'Storytelling with Data', provider: 'Cole Nussbaumer Knaflic', type: 'Curriculum' },
          { name: 'Tableau Public / Streamlit Gallery', provider: 'Tableau / Streamlit', type: 'Interactive' },
        ],
        tasks: [
          { label: 'Structure dashboard hierarchy: Executive Summary -> Regional Breakdown -> Drill-down', detail: 'Ensure users find core numbers in under 10 seconds' },
          { label: 'Implement dynamic date range parameters and segment filters', detail: 'Allow operations team to filter by customer cohort' },
          { label: 'Draft a 1-page Executive Memo highlighting 3 immediate strategic recommendations', detail: 'Write in concise, non-technical prose' },
        ],
        mentorAdvice: 'A great dashboard leads to a decision. If someone views your dashboard and asks "so what?", you have failed to tell a story.',
      },
      {
        phaseId: 4,
        title: 'Product Sense & Metric Drop Diagnostics',
        focusArea: 'Business Case Practice',
        objective: 'Diagnose why metrics dropped ("Conversion dropped 12% in Samarkand last Tuesday. Why?").',
        deliverable: 'Draft structured RCA (Root Cause Analysis) templates for 5 classic product metrics drop scenarios.',
        resources: [
          { name: 'StellarPeers Data Science Interview Cases', provider: 'StellarPeers', type: 'Playbook' },
          { name: 'Cracking the Data Science Interview', provider: 'Maverick Lin', type: 'Curriculum' },
        ],
        tasks: [
          { label: 'Formulate systematic diagnostic checklist: Internal bugs -> External events -> Cannibalization', detail: 'Segment by platform, version, geography, and user age' },
          { label: 'Practice verbal communication during live 30-minute case walkthroughs', detail: 'State hypotheses upfront and explain how you would query data to test them' },
          { label: 'Structure North Star vs input driver trees for delivery and fintech apps', detail: 'Identify leading indicators of long-term retention' },
        ],
        mentorAdvice: 'Never guess the answer. Interviewers want to see your diagnostic framework. Always ask clarifying questions before jumping to conclusions.',
      },
      {
        phaseId: 4,
        title: '1:1 Data Defense & Google XYZ Resume Review',
        focusArea: 'Career Launchpad',
        objective: 'Present your portfolio case study to a Lead Data Scientist / Analytics Manager.',
        deliverable: 'Score 85+ on Fair Resume Checker and submit applications to 10 verified data teams.',
        resources: [
          { name: 'MyRahnamo 1:1 Senior Data Mentors', provider: 'MyRahnamo', type: 'Interactive' },
          { name: 'HeadHunter & LinkedIn Tech Openings', provider: 'hh.uz / LinkedIn', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Book a 1:1 mock analytics defense with a verified Rahnamo from FinTech / Retail', detail: 'Answer challenging questions on statistical assumptions and business impact' },
          { label: 'Refactor resume bullets to lead with numbers: "Analyzed 1.2M transactions to identify $80k churn leakage"', detail: 'Verify with MyRahnamo AI Resume Checker' },
          { label: 'Publish your GitHub portfolio repository with badges and clean documentation', detail: 'Pin top 2 repositories and share on LinkedIn' },
        ],
        mentorAdvice: 'Your GitHub repo should have a GIF of the dashboard and a concise 3-paragraph summary. Hiring managers rarely have time to read 500 lines of code.',
      },
    ],
  },
  pm: {
    phases: [
      { id: 1, title: 'Product Discovery & The Mom Test', badge: 'FOUNDATIONS', description: 'Customer interviews, JTBD frameworks, and competitive positioning.' },
      { id: 2, title: 'Product Execution, PRDs & Prioritization', badge: 'EXECUTION', description: 'Engineering-ready PRDs, RICE scoring, and metric hierarchy trees.' },
      { id: 3, title: 'Flagship Product Case Study & Lo-Fi Prototype', badge: 'CAPSTONE', description: 'Solve a high-friction problem in Central Asian apps with interactive prototypes and GTM plans.' },
      { id: 4, title: 'Product Case Defense & 1:1 Lead PM Polish', badge: 'INTERVIEWS', description: 'Simulate high-stakes product design and metrics execution interviews.' },
    ],
    weeks: [
      {
        phaseId: 1,
        title: 'Customer Discovery & The Mom Test Methodology',
        focusArea: 'User Research',
        objective: 'Learn how to interview customers without biasing them or hearing false compliments.',
        deliverable: 'Synthesize 5 user discovery interviews into an actionable Insight Matrix and Problem Statement.',
        resources: [
          { name: 'The Mom Test: How to talk to customers', provider: 'Rob Fitzpatrick', type: 'Curriculum' },
          { name: 'Jobs to be Done (JTBD) Playbook', provider: 'Clayton Christensen Institute', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Formulate 10 unbiased interview questions focusing on past behaviors, not future promises', detail: 'Ask "How did you solve this last time?" instead of "Would you buy this?"' },
          { label: 'Conduct 5 user discovery interviews and record exact customer quotes', detail: 'Group pain points into high-urgency vs nice-to-have' },
          { label: 'Draft a JTBD statement: "When [situation], I want to [motivation], so that [outcome]"', detail: 'Validate statement with interview participants' },
        ],
        mentorAdvice: 'If a user says "I would totally use that!", they are lying to be polite. Find out what they actually spent time or money trying to fix last week.',
      },
      {
        phaseId: 1,
        title: 'Metrics Hierarchy: North Star & Input Drivers',
        focusArea: 'Product Metrics',
        objective: 'Construct rigorous metric trees connecting everyday engineering output to business enterprise value.',
        deliverable: 'Build a North Star Metric Tree diagram for a ride-sharing, food delivery, or fintech application.',
        resources: [
          { name: 'Lenny\'s Newsletter Product Metrics Guide', provider: 'Lenny Rachitsky', type: 'Curriculum' },
          { name: 'Amplitude Playbook: Mastering Retention', provider: 'Amplitude', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Define the North Star Metric and 3 input levers (Breadth, Depth, Frequency)', detail: 'Ensure metric measures user value, not vanity clicks' },
          { label: 'Identify Guardrail metrics to ensure quality and margins are protected', detail: 'Pair conversion rates with refund/cancellation rates' },
          { label: 'Map out the user activation funnel and define the "Aha! moment"', detail: 'Example: "Completes 3 searches within 48 hours of signup"' },
        ],
        mentorAdvice: 'A good North Star metric changes behavior. If the metric goes up, the customer must be genuinely better off.',
      },
      {
        phaseId: 2,
        title: 'Writing Engineering-Ready Product Requirements (PRDs)',
        focusArea: 'Product Execution',
        objective: 'Author unambiguous PRDs with user stories, acceptance criteria, and edge cases.',
        deliverable: 'Publish a comprehensive PRD in Notion/Google Docs with technical specs and event schemas.',
        resources: [
          { name: 'Reforge Product Management Foundations', provider: 'Reforge', type: 'Curriculum' },
          { name: 'How to write a PRD engineers love', provider: 'Kevin Yien (Square/Stripe)', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Draft User Stories with Gherkin acceptance criteria (Given / When / Then)', detail: 'Cover error states, offline behavior, and edge cases' },
          { label: 'Design event tracking schema (event_name, user_id, properties) for telemetry', detail: 'Ensure every key step in the flow is instrumented' },
          { label: 'Review PRD with a software engineering peer to eliminate ambiguities', detail: 'Revise technical feasibility based on peer feedback' },
        ],
        mentorAdvice: 'Engineers judge PMs by the clarity of their edge cases. What happens when the payment succeeds but the network drops before redirect?',
      },
      {
        phaseId: 2,
        title: 'Feature Prioritization Frameworks (RICE, Kano, Cost of Delay)',
        focusArea: 'Prioritization',
        objective: 'Evaluate competing requests from sales, leadership, and users with transparent math.',
        deliverable: 'RICE prioritization spreadsheet scoring 10 backlog initiatives with written justifications.',
        resources: [
          { name: 'Shreyas Doshi on Product Strategy & Execution', provider: 'Shreyas Doshi', type: 'Playbook' },
          { name: 'Intercom RICE Prioritization Method', provider: 'Intercom', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Score Reach, Impact, Confidence, and Effort across 10 proposed features', detail: 'Justify Confidence scores using customer interview data' },
          { label: 'Calculate final RICE score = (R * I * C) / E', detail: 'Rank initiatives and identify low-effort / high-impact quick wins' },
          { label: 'Roleplay defending your prioritized roadmap to skeptical executives', detail: 'Explain why popular pet features were deprioritized' },
        ],
        mentorAdvice: 'Saying "no" is the PM\'s superpower. Your job is not to build everything; your job is to maximize customer value per engineer-month.',
      },
      {
        phaseId: 3,
        title: 'Flagship Case Study: Teardown & Interactive Prototype',
        focusArea: 'Product Capstone',
        objective: 'Identify a massive user friction in Uzum, Kaspi, Payme, or Duolingo and redesign the experience.',
        deliverable: 'Complete Product Case Study document featuring user research, PRD, and Figma clickable prototype.',
        resources: [
          { name: 'Growth.design Product Teardowns', provider: 'Growth.design', type: 'Interactive' },
          { name: 'Figma Prototyping Basics for PMs', provider: 'Figma', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Map out the existing user flow and calculate drop-off friction points', detail: 'Document cognitive load and excessive form fields' },
          { label: 'Build low-fidelity interactive clickable prototype in Figma', detail: 'Streamline flow from 6 screens down to 3 focused steps' },
          { label: 'Draft Go-To-Market (GTM) rollout plan with beta rings and risk mitigation', detail: 'Plan 10% canary rollout with rollback triggers' },
        ],
        mentorAdvice: 'Put this case study in a public Notion page or personal website. When recruiters see real research + PRD + prototype, interviews follow.',
      },
      {
        phaseId: 3,
        title: 'Growth Experiments, A/B Testing & Funnel Diagnostics',
        focusArea: 'Growth Product',
        objective: 'Design high-tempo experimentation programs to increase activation and conversion.',
        deliverable: 'Write 3 Growth Experiment Cards detailing hypothesis, MDE, variant designs, and success metrics.',
        resources: [
          { name: 'Hacking Growth: How Today\'s Fastest-Growing Companies Drive Breakout Success', provider: 'Sean Ellis & Morgan Brown', type: 'Curriculum' },
          { name: 'Reforge Experimentation Engine', provider: 'Reforge', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Formulate hypotheses: "If we [change], then [metric will increase by X%], because [user rationale]"', detail: 'Avoid vanity testing; focus on core bottlenecks' },
          { label: 'Calculate statistical sample sizes needed to detect 5% relative lift', detail: 'Account for seasonal and weekend traffic fluctuations' },
          { label: 'Document post-experiment decision tree (ship, iterate, kill)', detail: 'Establish clear guidelines for borderline test results' },
        ],
        mentorAdvice: 'Most A/B tests fail. The best PMs extract deep user insights from failed experiments and iterate faster than competitors.',
      },
      {
        phaseId: 4,
        title: 'Product Design & Product Sense Interview Mastery',
        focusArea: 'PM Interview Prep',
        objective: 'Master structured frameworks for solving ambiguous product design questions in 45 minutes.',
        deliverable: 'Record 3 video responses answering classic PM design prompts ("Design an ATM for children", "Improve Spotify").',
        resources: [
          { name: 'Cracking the PM Interview', provider: 'Gayle McDowell & Jackie Bavaro', type: 'Curriculum' },
          { name: 'Exponent PM Interview Prep', provider: 'Exponent', type: 'Interactive' },
        ],
        tasks: [
          { label: 'Practice the CIRCLES method: Comprehend, Identify, Report, Cut, List, Evaluate, Summarize', detail: 'State target customer segments and trade-offs explicitly' },
          { label: 'Time-box ideation to 5 minutes and generate 3 innovative feature concepts', detail: 'Evaluate features against effort vs impact matrix' },
          { label: 'Summarize solution with 1 primary metric and 2 potential risks', detail: 'Conclude with proactive mitigation strategies' },
        ],
        mentorAdvice: 'Do not rush into solutions. Spend the first 10 minutes narrowing down the specific user persona and their primary emotional frustration.',
      },
      {
        phaseId: 4,
        title: '1:1 Mock PM Interview & Google XYZ Resume Review',
        focusArea: 'Career Launchpad',
        objective: 'Undergo a 60-minute simulated PM hiring loop with a Senior / Lead Product Manager.',
        deliverable: 'Score 85+ on Fair Resume Checker and apply to 10 verified product roles across Central Asia and remote hubs.',
        resources: [
          { name: 'MyRahnamo 1:1 Senior PM Mentors', provider: 'MyRahnamo', type: 'Interactive' },
          { name: 'Mind the Product Global Community', provider: 'Mind the Product', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Book a 1:1 mock interview with a verified PM from Uzum, EPAM, or Big Tech', detail: 'Receive line-by-line feedback on communication and prioritization rigor' },
          { label: 'Refactor resume bullets to showcase ownership: "Spearheaded checkout overhaul boosting Day-7 retention by 18%"', detail: 'Check with MyRahnamo AI Resume Checker' },
          { label: 'Network directly with Heads of Product on LinkedIn with a 2-sentence value pitch', detail: 'Include direct link to your Notion product case study' },
        ],
        mentorAdvice: 'In PM interviews, confidence is your currency. Speak clearly, state your assumptions, and be decisive when prioritizing trade-offs.',
      },
    ],
  },
  design: {
    phases: [
      { id: 1, title: 'Visual Foundations & Figma Component Architecture', badge: 'FOUNDATIONS', description: 'Design tokens, auto-layout 5.0, typography scales, and accessible contrast.' },
      { id: 2, title: 'UX Flows, Heuristic Audits & Usability Testing', badge: 'UX & RESEARCH', description: 'Nielsen Norman heuristics, journey mapping, and recorded usability testing.' },
      { id: 3, title: 'End-to-End Flagship Case Study (SaaS / Mobile)', badge: 'CAPSTONE', description: 'Design and prototype a full responsive product with quantified usability improvements.' },
      { id: 4, title: 'Whiteboard Design Defense & Portfolio Polish', badge: 'INTERVIEWS', description: 'Live design exercise simulation, portfolio presentation, and agency/tech review.' },
    ],
    weeks: [
      {
        phaseId: 1,
        title: 'Visual Hierarchy, Typography Scales & Design Tokens',
        focusArea: 'Visual Design',
        objective: 'Master layout grids, vertical rhythm, 8pt spacing systems, and accessible color palettes.',
        deliverable: 'Publish a Figma Design System starter kit with typography, color, and spacing variable tokens.',
        resources: [
          { name: 'Refactoring UI', provider: 'Adam Wathan & Steve Schoger', type: 'Curriculum' },
          { name: 'Figma Auto-Layout & Variables Guide', provider: 'Figma', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Construct an 8pt modular spacing and 1.250 major third typography scale', detail: 'Ensure consistent vertical rhythm across body and headings' },
          { label: 'Create semantic variable tokens (primary, surface, border, muted) for Light and Dark modes', detail: 'Test instantaneous theme switching in Figma' },
          { label: 'Verify color contrast ratios against WCAG 2.1 AA standards (minimum 4.5:1)', detail: 'Document accessible text and icon combinations' },
        ],
        mentorAdvice: 'Good UI design is not about decoration; it is about visual hierarchy. The user should instantly know where their eyes should look first.',
      },
      {
        phaseId: 1,
        title: 'Figma Component Architecture & Auto-Layout 5.0',
        focusArea: 'Figma Systems',
        objective: 'Build resilient, reusable components using nested auto-layout, boolean properties, and component variants.',
        deliverable: 'Build a production-grade UI component library (Buttons, Inputs, Modals, Tables, Dropdowns).',
        resources: [
          { name: 'Figma Community Design System Best Practices', provider: 'Figma Design', type: 'Documentation' },
          { name: 'Material Design 3 Component Specs', provider: 'Google', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Build buttons with interactive component states (default, hover, focus, disabled, loading)', detail: 'Use component properties for icons and labels' },
          { label: 'Create responsive card components that adapt fluidly to desktop and mobile widths', detail: 'Use min/max width constraints and wrap layouts' },
          { label: 'Document component usage guidelines and dos/don\'ts for engineering handoff', detail: 'Include clear padding and border-radius specifications' },
        ],
        mentorAdvice: 'If your Figma components break when someone changes the text length, your auto-layout is broken. Test with long multi-line copy.',
      },
      {
        phaseId: 2,
        title: 'UX Architecture, User Journeys & Heuristic Audits',
        focusArea: 'UX Design',
        objective: 'Map complex user journeys, identify emotional low-points, and evaluate interfaces against Nielsen Norman heuristics.',
        deliverable: 'Publish a 10-heuristic audit of an existing popular Central Asian app with before/after redesigns.',
        resources: [
          { name: '10 Usability Heuristics for User Interface Design', provider: 'Jakob Nielsen', type: 'Curriculum' },
          { name: 'Mapping Experiences', provider: 'Jim Kalbach', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Evaluate onboarding/checkout flow against Visibility of System Status and Error Prevention', detail: 'Grade each screen on a 1–5 severity scale' },
          { label: 'Map end-to-end user journey diagram showing user thoughts, emotions, and pain points', detail: 'Highlight highest-friction transitions' },
          { label: 'Redesign 3 high-friction screens and explain specific heuristic principles applied', detail: 'Show before and after side-by-side with annotations' },
        ],
        mentorAdvice: 'Hiring managers love heuristic audits because they prove you know why something is bad, not just that it "looks ugly".',
      },
      {
        phaseId: 2,
        title: 'Usability Testing & Iterative Prototyping',
        focusArea: 'Research & Validation',
        objective: 'Conduct recorded usability sessions on interactive prototypes to validate task completion rates.',
        deliverable: 'Synthesize 5 usability test recordings into an Affinity Map and quantitative completion matrix.',
        resources: [
          { name: 'Don\'t Make Me Think, Revisited', provider: 'Steve Krug', type: 'Curriculum' },
          { name: 'Rocket Surgery Made Easy', provider: 'Steve Krug', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Draft a 5-task usability test script with neutral, open-ended scenario prompts', detail: 'Avoid giving hints: "Show me how you would transfer money to your friend"' },
          { label: 'Conduct 5 moderated usability tests (in-person or remote via Loom/Zoom)', detail: 'Record task completion rate, time-on-task, and confusion areas' },
          { label: 'Iterate wireframes based on test findings and document what changed and why', detail: 'Explain how changes eliminated observed user hesitation' },
        ],
        mentorAdvice: 'Watching just 3 real users struggle with your design will teach you more than 100 hours of reading design blogs.',
      },
      {
        phaseId: 3,
        title: 'Flagship Capstone: End-to-End Responsive SaaS / Mobile App',
        focusArea: 'Design Capstone',
        objective: 'Solve a real-world problem from research to high-fidelity responsive prototype with measurable goals.',
        deliverable: 'Complete Behance / personal portfolio case study featuring problem, research, iterations, and interactive Figma embed.',
        resources: [
          { name: 'Case Study Club Best Portfolio Examples', provider: 'Case Study Club', type: 'Interactive' },
          { name: 'UX Design Process Framework', provider: 'Nielsen Norman Group', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Frame the business problem, target persona, and primary success metrics', detail: 'Example: "Reduce medical appointment booking abandonment by 30%"' },
          { label: 'Build comprehensive wireframe flows and test layout alternatives', detail: 'Explore 3 distinct navigational paradigms before picking one' },
          { label: 'Create high-fidelity interactive prototype with fluid micro-interactions and realistic data', detail: 'Simulate true app responsiveness and loading states' },
        ],
        mentorAdvice: 'Never show only finished screens in a case study. Show your messy scribbles, discarded wireframes, and what you learned when your first idea failed.',
      },
      {
        phaseId: 3,
        title: 'Micro-Interactions & Developer Handoff Specs',
        focusArea: 'Handoff & Motion',
        objective: 'Design fluid micro-interactions in Figma Smart Animate and deliver crystal-clear specs to engineers.',
        deliverable: 'Handoff-ready Figma file with redlines, responsive breakpoints, variable tokens, and motion specs.',
        resources: [
          { name: 'Microinteractions: Designing with Details', provider: 'Dan Saffer', type: 'Curriculum' },
          { name: 'Design Handoff Guide', provider: 'Figma', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Design interactive states for buttons, inputs, dropdowns, and toast notifications', detail: 'Specify cubic-bezier easing curves and millisecond durations' },
          { label: 'Document responsive breakpoint rules (Desktop 1440, Tablet 768, Mobile 375)', detail: 'Define which elements reflow, hide, or stack' },
          { label: 'Review designs with a frontend developer to identify expensive CSS/animation overheads', detail: 'Refactor complex transitions for 60fps performance' },
        ],
        mentorAdvice: 'Engineers love designers who understand box models, flex wrapping, and responsive constraints. Speak their language.',
      },
      {
        phaseId: 4,
        title: 'Live Whiteboard Design Challenge Mastery',
        focusArea: 'Design Interviews',
        objective: 'Master structured problem-solving for live 45-minute whiteboard design exercises in interviews.',
        deliverable: 'Solve 3 design whiteboard prompts on FigJam with recorded 15-minute walkthrough presentations.',
        resources: [
          { name: 'Solving Product Design Exercises', provider: 'Artiom Dashinsky', type: 'Playbook' },
          { name: 'Design Whiteboard Challenge Framework', provider: 'Femke Design', type: 'Curriculum' },
        ],
        tasks: [
          { label: 'Practice the 5-step whiteboard framework: Clarify -> User -> Journey -> Wireframe -> Evaluate', detail: 'Write assumptions on the board before drawing any screens' },
          { label: 'Time-box sketching to 20 minutes and talk through every design rationale out loud', detail: 'Explain why alternative layouts were rejected' },
          { label: 'Conclude with metrics to measure success and edge cases to consider next', detail: 'Demonstrate holistic product thinking' },
        ],
        mentorAdvice: 'In whiteboard challenges, interviewers care about your thought process, not your drawing skills. Keep asking: "What is the user trying to achieve here?"',
      },
      {
        phaseId: 4,
        title: '1:1 Portfolio Review & Google XYZ Resume Alignment',
        focusArea: 'Career Launchpad',
        objective: 'Undergo a 60-minute live portfolio critique with a Lead Designer / Design Director.',
        deliverable: 'Score 85+ on Fair Resume Checker and apply to 10 verified UI/UX design opportunities.',
        resources: [
          { name: 'MyRahnamo 1:1 Senior Design Mentors', provider: 'MyRahnamo', type: 'Interactive' },
          { name: 'Dribbble & ReadCV Verified Profiles', provider: 'Design Communities', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Book a 1:1 portfolio review with a verified Rahnamo from top design studios', detail: 'Receive brutal, constructive critique on visual craft and storytelling' },
          { label: 'Refactor resume bullets using Google XYZ: "Overhauled mobile checkout flow, decreasing drop-off by 27%"', detail: 'Verify with MyRahnamo AI Resume Checker' },
          { label: 'Optimize personal portfolio site with fast image loading and mobile responsiveness', detail: 'Ensure your top case study is reachable in one click' },
        ],
        mentorAdvice: 'Keep your portfolio to 2–3 outstanding case studies. One thorough, deeply reasoned case study beats 10 shallow Dribbble screenshots.',
      },
    ],
  },
  abroad: {
    phases: [
      { id: 1, title: 'Profile Diagnostic, Program Matrix & Standardized Testing', badge: 'DIAGNOSTIC', description: 'Academic trajectory audit, shortlisting fully-funded grants, and IELTS/GRE strategy.' },
      { id: 2, title: 'Narrative Arc & Winning Personal Statement Polish', badge: 'STORYTELLING', description: 'Crafting compelling personal statements, study objectives, and faculty outreach.' },
      { id: 3, title: 'Dossier Assembly & Scholarship Committee Submissions', badge: 'SUBMISSION', description: 'Recommendation letters, transcripts, fee waivers, and official portal submissions.' },
      { id: 4, title: 'Selection Committee Mock Defense & Visa Preparation', badge: 'INTERVIEWS', description: 'Simulate high-stakes embassy/panel interviews with past scholarship recipients.' },
    ],
    weeks: [
      {
        phaseId: 1,
        title: 'Profile Diagnostic & Fully-Funded Program Matrix',
        focusArea: 'Program Strategy',
        objective: 'Audit GPA, research experience, and leadership to construct an 8-program funding matrix.',
        deliverable: 'Comprehensive Program Matrix spreadsheet comparing 8 target scholarships across US, Europe, and Asia.',
        resources: [
          { name: 'EducationUSA Advising Resources', provider: 'U.S. Department of State', type: 'Official Portal' },
          { name: 'DAAD Scholarship Database Germany', provider: 'DAAD', type: 'Official Portal' },
        ],
        tasks: [
          { label: 'Convert academic grades to 4.0 GPA scale and identify academic strengths/gaps', detail: 'Calculate cumulative and major-specific GPA' },
          { label: 'Shortlist 8 fully-funded grants (Fulbright, DAAD, Chevening, Erasmus Mundus, Türkiye Bursları, El-Yurt Umidi)', detail: 'Document deadlines, eligibility, and required documents' },
          { label: 'Map required standardized exams and set target score thresholds', detail: 'Target IELTS 7.5+ or TOEFL 100+ for competitive consideration' },
        ],
        mentorAdvice: 'Never apply to only 1 scholarship. Winning students apply to 6–8 fully-funded programs across multiple countries to maximize odds.',
      },
      {
        phaseId: 1,
        title: 'Standardized Exam Mastery: IELTS 7.5+ / TOEFL / GRE Plan',
        focusArea: 'Standardized Exams',
        objective: 'Execute diagnostic exams and establish an intensive 8-week target milestone schedule.',
        deliverable: 'Complete full official diagnostic test and score analysis with targeted daily drill plan.',
        resources: [
          { name: 'IELTS Official Practice Materials', provider: 'British Council & Cambridge', type: 'Practice' },
          { name: 'GregMat GRE Prep Strategies', provider: 'GregMat', type: 'Curriculum' },
        ],
        tasks: [
          { label: 'Take full-length timed diagnostic exam under strict simulated testing conditions', detail: 'Identify exact weak section: Writing Task 2 or Listening section 4' },
          { label: 'Practice 15 Writing Task 2 essays focusing on coherence, cohesion, and academic vocabulary', detail: 'Review essays against official Band 8/9 descriptors' },
          { label: 'Schedule and book official exam date 60 days before first application deadline', detail: 'Leave buffer time for score reporting and potential retake' },
        ],
        mentorAdvice: 'In IELTS Writing Task 2, examiners look for balanced arguments, clear topic sentences, and specific examples. Avoid memorized idioms.',
      },
      {
        phaseId: 2,
        title: 'Academic CV (European Europass / US 2-Page Standard)',
        focusArea: 'Academic Resume',
        objective: 'Format an academic curriculum vitae highlighting research, publications, awards, and leadership.',
        deliverable: 'Standard 2-page Academic CV formatted in clean LaTeX or Word, scoring 85+ on Fair Benchmark.',
        resources: [
          { name: 'Harvard University Academic CV Guide', provider: 'Harvard Graduate School', type: 'Playbook' },
          { name: 'Europass CV Official Portal', provider: 'European Union', type: 'Official Portal' },
        ],
        tasks: [
          { label: 'Structure sections: Education -> Research Experience -> Publications -> Leadership -> Awards', detail: 'Ensure reverse chronological order throughout' },
          { label: 'Quantify impact in leadership and research: "Led student union of 450 members, raising $12k in conference grants"', detail: 'Use active academic verbs' },
          { label: 'Eliminate non-academic formatting: no photos, no age, no marital status (for US/UK)', detail: 'Ensure strict compliance with international hiring standards' },
        ],
        mentorAdvice: 'An academic CV differs from a corporate resume: it can be 2–3 pages, and it prioritizes research papers, conferences, and teaching assistantships.',
      },
      {
        phaseId: 2,
        title: 'The Core Narrative: Personal Statement Arc',
        focusArea: 'Personal Statement',
        objective: 'Craft a compelling personal transformation story connecting personal struggles to academic purpose.',
        deliverable: 'First complete draft of 800-word Personal Statement reviewed against narrative rubric.',
        resources: [
          { name: 'Winning Fulbright & Chevening Personal Statements', provider: 'Scholarship Alumni Guild', type: 'Playbook' },
          { name: 'On Writing Well', provider: 'William Zinsser', type: 'Curriculum' },
        ],
        tasks: [
          { label: 'Identify your "Inciting Incident": what specific life experience shaped your intellectual curiosity?', detail: 'Avoid generic openers like "Ever since I was a child..."' },
          { label: 'Demonstrate resilience: how did you overcome a concrete academic or personal obstacle?', detail: 'Focus on your actions and growth, not victimhood' },
          { label: 'Connect your graduate study directly to returning home and creating systemic impact in Central Asia', detail: 'Explain why your country desperately needs this expertise' },
        ],
        mentorAdvice: 'Selection committees read thousands of essays. The essays that win do not brag about achievements; they show maturity, self-awareness, and relentless drive.',
      },
      {
        phaseId: 3,
        title: 'Study Objective & Research Proposal Formulation',
        focusArea: 'Research & Study Goals',
        objective: 'Formulate rigorous research questions aligning with prospective university faculty publications.',
        deliverable: 'Complete 1,000-word Study Objective document with literature references and faculty alignment.',
        resources: [
          { name: 'How to write a Graduate Research Proposal', provider: 'Oxford University', type: 'Documentation' },
          { name: 'Google Scholar & ResearchGate Profiles', provider: 'Academic Search', type: 'Interactive' },
        ],
        tasks: [
          { label: 'Identify 3 professors at target universities whose recent papers align with your interests', detail: 'Cite their publications directly in your study objective' },
          { label: 'Outline research methodology: qualitative field studies, statistical modeling, or lab experiments', detail: 'Demonstrate you know how academic inquiry works' },
          { label: 'Explain why this specific program and faculty cannot be replicated elsewhere', detail: 'Mention specialized labs, archives, or regional partnerships' },
        ],
        mentorAdvice: 'Personal statements show who you are. Study objectives show what you will do. Be academically precise, not broad and vague.',
      },
      {
        phaseId: 3,
        title: 'Strategic Recommendation Letters & Institutional Dossier',
        focusArea: 'Letters & Transcripts',
        objective: 'Secure 3 glowing recommendation letters from professors and employers who know you intimately.',
        deliverable: 'Recommendation Letter Briefs for 3 referees with customized accomplishment bullet points.',
        resources: [
          { name: 'Guide to Securing Strong Recommendation Letters', provider: 'MIT Career Services', type: 'Playbook' },
          { name: 'Official Transcript Translation & Apostille Guide', provider: 'Ministry of Higher Education', type: 'Documentation' },
        ],
        tasks: [
          { label: 'Select 2 academic professors and 1 professional supervisor who can speak to distinct strengths', detail: 'Avoid selecting famous professors who barely know your name' },
          { label: 'Provide each referee with a 1-page "Brag Sheet" summarizing projects, grades, and essay goals', detail: 'Make it effortless for them to write a specific, detailed letter' },
          { label: 'Obtain official academic transcripts, notarized translations, and government apostilles', detail: 'Scan in high-resolution PDF format under 2MB' },
        ],
        mentorAdvice: 'A generic letter ("The student attended class and got an A") hurts your application. A great letter tells a story about how you solved a difficult problem after class.',
      },
      {
        phaseId: 4,
        title: 'Portal Submissions & Application Fee Waivers',
        focusArea: 'Final Submissions',
        objective: 'Submit flawless application dossiers across target portals ahead of deadlines.',
        deliverable: 'Submission receipts for 4–6 university and scholarship portals with zero missing items.',
        resources: [
          { name: 'Fulbright Online Application Portal', provider: 'IIE', type: 'Official Portal' },
          { name: 'Chevening Online Application System (OAS)', provider: 'Foreign Commonwealth Office', type: 'Official Portal' },
        ],
        tasks: [
          { label: 'Request university application fee waivers (saving $75–$120 per application)', detail: 'Submit international financial hardship documentation where applicable' },
          { label: 'Proofread every form field, essay upload, and recommender contact detail 3 times', detail: 'Ensure zero typos in passport numbers or email addresses' },
          { label: 'Submit applications at least 5 business days before the official deadline', detail: 'Avoid last-minute portal crashes during deadline day' },
        ],
        mentorAdvice: 'Every year, portal servers crash in the final 4 hours before deadlines. Never, ever submit on the final day.',
      },
      {
        phaseId: 4,
        title: '1:1 Scholarship Committee Mock Interview Simulation',
        focusArea: 'Panel Defense',
        objective: 'Simulate high-stakes embassy and selection committee interviews with a past scholarship winner.',
        deliverable: 'Pass 45-minute simulated panel interview with written feedback on non-verbal presence and pitch clarity.',
        resources: [
          { name: 'MyRahnamo 1:1 Fulbright / DAAD Alumnus Mentors', provider: 'MyRahnamo', type: 'Interactive' },
          { name: 'Embassy Selection Committee Interview Questions', provider: 'Alumni Network', type: 'Playbook' },
        ],
        tasks: [
          { label: 'Book a 1:1 mock interview with an alumnus who won the exact grant you applied for', detail: 'Simulate tough questions: "Why shouldn\'t we give this scholarship to someone else?"' },
          { label: 'Rehearse your 60-second vision pitch on camera without rambling', detail: 'Maintain confident eye contact and clear posture' },
          { label: 'Prepare 3 thoughtful questions to ask the interview panel at the end of the session', detail: 'Demonstrate deep institutional knowledge' },
        ],
        mentorAdvice: 'Committees do not fund academics who want to escape their country. They fund future leaders who will return and build institutions. Show your commitment to Central Asia.',
      },
    ],
  },
};

export function buildDetailedPlan(
  roleId: RoleId,
  level: RoadmapLevel,
  commitment: WeeklyCommitment,
  targetWeeks: number,
  knownSkills: string[]
): DetailedWeekMilestone[] {
  const curriculum = CURRICULUM_DATA[roleId] || CURRICULUM_DATA.swe;
  let sourceWeeks = [...curriculum.weeks];

  if (level === 'intermediate') {
    sourceWeeks = sourceWeeks.slice(1);
  } else if (level === 'advanced') {
    sourceWeeks = sourceWeeks.slice(2);
  }

  const baseHours = commitment === 'full_time' ? 18 : 10;
  const result: DetailedWeekMilestone[] = [];

  for (let w = 1; w <= targetWeeks; w++) {
    const srcIndex = Math.min(
      sourceWeeks.length - 1,
      Math.floor(((w - 1) / targetWeeks) * sourceWeeks.length)
    );
    const item = sourceWeeks[srcIndex];
    const phaseInfo = curriculum.phases.find((p) => p.id === item.phaseId) || curriculum.phases[0];

    const weekTasks = item.tasks.map((t, idx) => ({
      id: `w${w}-t${idx}`,
      label: t.label,
      detail: t.detail,
    }));

    result.push({
      weekNum: w,
      phaseId: item.phaseId,
      phaseTitle: phaseInfo.title,
      title: item.title,
      focusArea: item.focusArea,
      objective: item.objective,
      deliverable: item.deliverable,
      estimatedHours: Math.round(baseHours * (w % 2 === 0 ? 1.1 : 0.95)),
      resources: item.resources,
      tasks: weekTasks,
      mentorAdvice: item.mentorAdvice,
    });
  }

  return result;
}

const STORAGE_KEY = 'rahnamo_ai_plan_v2';

interface StoredPlanV2 {
  roleId: RoleId;
  level: RoadmapLevel;
  commitment: WeeklyCommitment;
  weeks: number;
  known: string[];
  doneTasks: Record<string, boolean>;
}

export default function AiCareerTools() {
  const [mode, setMode] = useState<'resume' | 'roadmap'>('resume');

  // Resume checker state
  const [resumeText, setResumeText] = useState('');
  const [resumeRole, setResumeRole] = useState<RoleId>('swe');
  const [seniority, setSeniority] = useState<SeniorityLevel>('student');
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runBenchmark = (textToAnalyze: string = resumeText) => {
    if (textToAnalyze.trim().length < 30) return;
    const roleObj = ROLES.find((r) => r.id === resumeRole) || ROLES[0];
    const res = analyzeResumeWithBenchmark(textToAnalyze, roleObj, seniority);
    setReport(res);
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setFileError('');
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File exceeds 5 MB size limit.');
      return;
    }
    setFileBusy(true);
    try {
      const text = (await extractTextFromFile(file)).trim();
      if (text.length < 30) {
        setFileError('No text extracted. Scanned image-only PDFs are not supported yet; upload a standard PDF, DOCX or TXT.');
        return;
      }
      setFileName(file.name);
      setResumeText(text);
      const roleObj = ROLES.find((r) => r.id === resumeRole) || ROLES[0];
      setReport(analyzeResumeWithBenchmark(text, roleObj, seniority));
    } catch (err) {
      setFileError(
        err instanceof Error && err.message === 'unsupported'
          ? 'Unsupported file format. Please upload PDF, DOCX or TXT.'
          : 'Could not read document. Try copy-pasting the text instead.'
      );
    } finally {
      setFileBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Roadmap maker state
  const [roleId, setRoleId] = useState<RoleId>('swe');
  const [level, setLevel] = useState<RoadmapLevel>('beginner');
  const [commitment, setCommitment] = useState<WeeklyCommitment>('part_time');
  const [weeks, setWeeks] = useState(12);
  const [known, setKnown] = useState<string[]>([]);
  const [plan, setPlan] = useState<DetailedWeekMilestone[] | null>(null);
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({});
  const [copiedPlan, setCopiedPlan] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true, 2: true });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as StoredPlanV2;
      const r = ROLES.find((item) => item.id === s.roleId);
      if (!r) return;
      setRoleId(s.roleId);
      setLevel(s.level || 'beginner');
      setCommitment(s.commitment || 'part_time');
      setWeeks(s.weeks || 12);
      setKnown(s.known || []);
      setDoneTasks(s.doneTasks || {});
      setPlan(buildDetailedPlan(s.roleId, s.level || 'beginner', s.commitment || 'part_time', s.weeks || 12, s.known || []));
    } catch {
      // ignore
    }
  }, []);

  const persistRoadmap = (next: StoredPlanV2) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const currentRole = ROLES.find((r) => r.id === roleId) || ROLES[0];

  const generatePlan = () => {
    const p = buildDetailedPlan(roleId, level, commitment, weeks, known);
    setPlan(p);
    setDoneTasks({});
    setExpandedWeeks({ 1: true, 2: true });
    persistRoadmap({ roleId, level, commitment, weeks, known, doneTasks: {} });
  };

  const toggleTask = (taskId: string) => {
    setDoneTasks((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      persistRoadmap({ roleId, level, commitment, weeks, known, doneTasks: next });
      return next;
    });
  };

  const toggleWeekExpand = (wNum: number) => {
    setExpandedWeeks((prev) => ({ ...prev, [wNum]: !prev[wNum] }));
  };

  const resetPlan = () => {
    setPlan(null);
    setDoneTasks({});
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const progress = useMemo(() => {
    if (!plan) return { done: 0, total: 0, pct: 0, hoursLeft: 0, totalHours: 0 };
    let total = 0;
    let done = 0;
    let totalHours = 0;
    let doneHours = 0;

    plan.forEach((w) => {
      totalHours += w.estimatedHours;
      const weekTasksCount = w.tasks.length;
      let weekDoneCount = 0;
      w.tasks.forEach((t) => {
        total++;
        if (doneTasks[t.id]) {
          done++;
          weekDoneCount++;
        }
      });
      if (weekTasksCount > 0) {
        doneHours += (weekDoneCount / weekTasksCount) * w.estimatedHours;
      }
    });

    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const hoursLeft = Math.max(0, Math.round(totalHours - doneHours));
    return { done, total, pct, hoursLeft, totalHours };
  }, [plan, doneTasks]);

  const copyMarkdownPlan = () => {
    if (!plan) return;
    let md = `# ${currentRole.label} Career Roadmap (${weeks} Weeks)\n\n`;
    md += `**Level:** ${level.toUpperCase()} | **Commitment:** ${commitment === 'part_time' ? '8–10 hrs/week' : '16–20 hrs/week'}\n\n`;
    plan.forEach((w) => {
      md += `## Week ${w.weekNum}: ${w.title} (${w.phaseTitle})\n`;
      md += `*Objective:* ${w.objective}\n`;
      md += `*Deliverable:* ${w.deliverable}\n`;
      md += `*Resources:* ${w.resources.map((r) => `${r.name} (${r.provider})`).join(', ')}\n`;
      md += `### Milestones:\n`;
      w.tasks.forEach((t) => {
        const isDone = doneTasks[t.id];
        md += `- [${isDone ? 'x' : ' '}] ${t.label} — ${t.detail}\n`;
      });
      md += `\n> **Mentor Tip:** ${w.mentorAdvice}\n\n---\n\n`;
    });

    navigator.clipboard.writeText(md).then(() => {
      setCopiedPlan(true);
      setTimeout(() => setCopiedPlan(false), 2500);
    });
  };

  const tierColors = {
    Excellent: 'text-emerald-400 bg-emerald-500/15 border-emerald-400/30',
    Competitive: 'text-[#F59E0B] bg-[#F59E0B]/15 border-[#F59E0B]/30',
    'Needs Improvement': 'text-amber-300 bg-amber-500/15 border-amber-400/30',
    'Critical Gaps': 'text-rose-400 bg-rose-500/15 border-rose-400/30',
  };

  return (
    <div className="space-y-6">
      {/* Tool Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('resume')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold cursor-pointer transition-all ${
              mode === 'resume'
                ? 'bg-[#0F1E36] text-[#F59E0B] shadow-sm'
                : 'bg-white border border-[#0F1E36]/10 text-[#475569]'
            }`}
          >
            <FileText className="w-4 h-4" /> AI Resume Benchmark (Google XYZ)
          </button>
          <button
            type="button"
            onClick={() => setMode('roadmap')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold cursor-pointer transition-all ${
              mode === 'roadmap'
                ? 'bg-[#0F1E36] text-[#F59E0B] shadow-sm'
                : 'bg-white border border-[#0F1E36]/10 text-[#475569]'
            }`}
          >
            <Compass className="w-4 h-4" /> Real Detailed AI Career Roadmap
          </button>
        </div>

        <div className="text-[11px] font-mono text-[#475569]">
          100% In-Browser Privacy • Zero Data Sent to External LLMs
        </div>
      </div>

      {/* =====================================================================
          MODE 1: FAIR RESUME CHECKER WITH GOOGLE XYZ BENCHMARK
          ===================================================================== */}
      {mode === 'resume' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Inputs & File Upload */}
          <div className="lg:col-span-5 yv-card">
            <div className="yv-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-xl text-[#0F1E36]">
                  Resume ATS & XYZ Audit
                </h3>
                <span className="text-[10px] font-mono uppercase bg-[#F59E0B]/15 text-[#92400E] px-2.5 py-1 rounded-full font-bold">
                  Fair Benchmark v2
                </span>
              </div>

              {/* Target Role & Seniority Calibration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F1E36] mb-1.5">
                    Target Role
                  </label>
                  <select
                    value={resumeRole}
                    onChange={(e) => {
                      const next = e.target.value as RoleId;
                      setResumeRole(next);
                      if (resumeText) {
                        const roleObj = ROLES.find((r) => r.id === next) || ROLES[0];
                        setReport(analyzeResumeWithBenchmark(resumeText, roleObj, seniority));
                      }
                    }}
                    className="w-full rounded-xl border border-[#0F1E36]/15 bg-[#FBF9F5] px-3 py-2 text-xs font-semibold text-[#0F1E36]"
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F1E36] mb-1.5 flex items-center justify-between">
                    <span>Seniority Level</span>
                    <span className="text-[10px] text-[#D97706] font-normal">Calibrates scoring</span>
                  </label>
                  <select
                    value={seniority}
                    onChange={(e) => {
                      const next = e.target.value as SeniorityLevel;
                      setSeniority(next);
                      if (resumeText) {
                        const roleObj = ROLES.find((r) => r.id === resumeRole) || ROLES[0];
                        setReport(analyzeResumeWithBenchmark(resumeText, roleObj, next));
                      }
                    }}
                    className="w-full rounded-xl border border-[#0F1E36]/15 bg-[#FBF9F5] px-3 py-2 text-xs font-semibold text-[#0F1E36]"
                  >
                    <option value="student">🎓 Student / Intern (Fair)</option>
                    <option value="junior">💼 Junior (1–2 yrs)</option>
                    <option value="mid_senior">🚀 Mid / Senior (3+ yrs)</option>
                  </select>
                </div>
              </div>

              {/* Drag and Drop File Upload Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  handleFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-[#F59E0B] bg-[#F59E0B]/10'
                    : 'border-[#0F1E36]/20 bg-[#FBF9F5]/70 hover:border-[#0F1E36]/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {fileBusy ? (
                  <div className="py-2 flex flex-col items-center gap-2 text-xs font-bold text-[#0F1E36]">
                    <Loader2 className="w-6 h-6 animate-spin text-[#D97706]" />
                    <span>Parsing document in browser...</span>
                  </div>
                ) : fileName ? (
                  <div className="py-1 flex items-center justify-center gap-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Loaded: {fileName}</span>
                    <span className="text-[10px] text-slate-500 underline ml-2">Click to replace</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <UploadCloud className="w-7 h-7 mx-auto text-[#D97706]" />
                    <div className="text-xs font-bold text-[#0F1E36]">
                      Drop your resume here, or <span className="text-[#D97706] underline">browse</span>
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      Supports PDF, DOCX, TXT up to 5MB • 100% private in-browser parsing
                    </div>
                  </div>
                )}
              </div>

              {fileError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Paste Text Fallback */}
              <div>
                <label className="block text-xs font-bold text-[#0F1E36] mb-1.5 flex items-center justify-between">
                  <span>Or Paste Plain Resume Text</span>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    {resumeText ? `${resumeText.trim().split(/\s+/).filter(Boolean).length} words` : ''}
                  </span>
                </label>
                <textarea
                  rows={6}
                  value={resumeText}
                  onChange={(e) => {
                    setResumeText(e.target.value);
                    if (fileName) setFileName('');
                  }}
                  placeholder="Paste experience bullet points, skills, and summary here..."
                  className="w-full rounded-2xl border border-[#0F1E36]/15 bg-[#FBF9F5] p-3 text-xs text-[#0F1E36] placeholder:text-[#94A3B8] focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => runBenchmark()}
                  disabled={resumeText.trim().length < 30}
                  className="btn-yv-primary flex-1 justify-center cursor-pointer disabled:opacity-50 !py-2.5 text-xs font-bold"
                >
                  <Sparkles className="w-4 h-4" /> Run Google XYZ Audit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResumeText('');
                    setReport(null);
                    setFileName('');
                    setFileError('');
                  }}
                  className="px-4 rounded-full border border-[#0F1E36]/15 text-xs font-bold text-[#475569] cursor-pointer hover:bg-[#0F1E36]/[0.05]"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Multidimensional Benchmark Score & Google XYZ Bullet Breakdowns */}
          <div className="lg:col-span-7 rounded-3xl bg-[#0F1E36] text-white p-6 sm:p-8 border border-[#F59E0B]/35 shadow-2xl neo-silk-tessellation-dark">
            {!report ? (
              <div className="py-20 text-center text-slate-300 text-sm space-y-3">
                <Award className="w-10 h-10 text-[#F59E0B] mx-auto opacity-70" />
                <div className="font-display font-bold text-lg text-white">
                  Fair Recruiting Benchmarking Engine
                </div>
                <p className="max-w-md mx-auto text-xs text-slate-400">
                  Calibrated against Google HR&apos;s XYZ formula, semantic skill clusters, and seniority levels (intern vs senior). Upload your PDF or paste text to begin.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Benchmark Overall Score Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#F59E0B]">
                      FAIR BENCHMARK SCORE • {report.seniority.toUpperCase()} LEVEL
                    </div>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="font-mono font-extrabold text-5xl text-white">
                        {report.overallScore}
                      </span>
                      <span className="text-xl font-mono text-slate-400">/ 100</span>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${tierColors[report.tier]}`}
                      >
                        {report.tier}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-300 font-mono">
                    <div>{report.wordCount} Words Total</div>
                    <div className="text-[#F59E0B]">{report.bulletCount} Evaluated Bullets</div>
                  </div>
                </div>

                {/* 4 Dimension Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { key: 'impact', title: 'Impact (XYZ)', d: report.dimensions.impact },
                    { key: 'competency', title: 'Competencies', d: report.dimensions.competency },
                    { key: 'structure', title: 'Structure', d: report.dimensions.structure },
                    { key: 'brevity', title: 'Style & Voice', d: report.dimensions.brevity },
                  ].map(({ key, title, d }) => {
                    const pct = Math.round((d.score / d.max) * 100);
                    return (
                      <div
                        key={key}
                        className="rounded-2xl bg-white/[0.05] border border-white/10 p-3"
                      >
                        <div className="text-[10px] font-mono text-slate-300 uppercase truncate">
                          {title}
                        </div>
                        <div className="font-mono font-extrabold text-xl text-[#F59E0B] mt-1">
                          {d.score}
                          <span className="text-xs text-slate-400 font-normal">/{d.max}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#C25E38]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Google XYZ Formula Bullet-by-Bullet Breakdown */}
                {report.bulletAudits.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#F59E0B] flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>GOOGLE XYZ FORMULA AUDIT (FIRST {report.bulletAudits.length} BULLETS)</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        X = Action, Y = Metric, Z = Context
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {report.bulletAudits.map((bullet, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-200 font-medium leading-relaxed">
                              &ldquo;{bullet.raw}&rdquo;
                            </span>
                            <span
                              className={`shrink-0 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                bullet.xyzScore >= 80
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : bullet.xyzScore >= 50
                                  ? 'bg-[#F59E0B]/20 text-amber-200'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              XYZ {bullet.xyzScore}%
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                            <span
                              className={`px-2 py-0.5 rounded ${
                                bullet.hasActionVerb
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-white/10 text-slate-400'
                              }`}
                            >
                              Action: {bullet.actionVerb ? `✓ "${bullet.actionVerb}"` : '✗ Missing'}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded ${
                                bullet.hasMetric
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-white/10 text-slate-400'
                              }`}
                            >
                              Metric: {bullet.hasMetric ? `✓ "${bullet.metricSnippet}"` : '✗ Missing'}
                            </span>

                            <span className="px-2 py-0.5 rounded bg-white/10 text-slate-400">
                              Length: {bullet.wordCount} words
                            </span>
                          </div>

                          {bullet.feedback.length > 0 && (
                            <p className="text-[11px] text-amber-200/90 pl-2 border-l-2 border-[#F59E0B]">
                              Fix: {bullet.feedback[0]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Semantic Clusters: Detected vs Missing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                    <div className="text-[10px] font-mono font-bold uppercase text-emerald-400 mb-2">
                      ✓ DETECTED COMPETENCIES ({report.matchedClusters.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {report.matchedClusters.length > 0 ? (
                        report.matchedClusters.map((c, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-bold"
                          >
                            ✓ {c.name} ({c.foundKeyword})
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">
                          No core technical clusters detected.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                    <div className="text-[10px] font-mono font-bold uppercase text-[#F59E0B] mb-2">
                      ✗ RECOMMENDED COMPETENCIES ({report.missingClusters.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {report.missingClusters.length > 0 ? (
                        report.missingClusters.map((name, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-[#C25E38]/25 border border-[#C25E38]/50 text-amber-200 text-xs font-bold"
                          >
                            + {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-300 font-semibold">
                          All expected competency clusters covered!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actionable Findings Checklist */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    DIAGNOSTIC ADVISORY
                  </div>
                  {report.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                      {f.level === 'good' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            f.level === 'bad' ? 'text-rose-400' : 'text-[#F59E0B]'
                          }`}
                        />
                      )}
                      <div>
                        <span className="font-mono text-[10px] uppercase font-bold text-slate-400 mr-2">
                          [{f.category}]
                        </span>
                        <span>{f.text}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mentor Connection CTA */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-300">
                    Want a Lead Engineer or Fulbright Scholar to conduct a live 1:1 CV audit?
                  </span>
                  <a
                    href="#rahnamolar"
                    className="inline-flex items-center gap-1.5 font-bold text-[#F59E0B] hover:text-white transition-colors"
                  >
                    <span>Book 1:1 Rahnamo Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 2: REAL, FAIR, DETAILED AI ROADMAP GENERATOR & TRACKER
          ===================================================================== */}
      {mode === 'roadmap' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Configuration Panel */}
          <div className="lg:col-span-5 yv-card">
            <div className="yv-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-xl text-[#0F1E36]">
                  Calibrate your Roadmap
                </h3>
                <span className="text-[10px] font-mono uppercase bg-[#F59E0B]/15 text-[#92400E] px-2.5 py-1 rounded-full font-bold">
                  Curriculum Engine
                </span>
              </div>

              {/* 1. Target Role */}
              <div>
                <label className="block text-xs font-bold text-[#0F1E36] mb-1.5">
                  1. Target Career Goal
                </label>
                <select
                  value={roleId}
                  onChange={(e) => {
                    setRoleId(e.target.value as RoleId);
                    setKnown([]);
                  }}
                  className="w-full rounded-xl border border-[#0F1E36]/15 bg-[#FBF9F5] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#0F1E36]"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Current Starting Level (Fair Calibration) */}
              <div>
                <label className="block text-xs font-bold text-[#0F1E36] mb-1.5 flex items-center justify-between">
                  <span>2. Current Starting Level</span>
                  <span className="text-[10px] text-[#D97706] font-normal">Fair pacing</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'beginner', label: 'Beginner', desc: 'From scratch' },
                    { id: 'intermediate', label: 'Transition', desc: 'Has basics' },
                    { id: 'advanced', label: 'Job-Ready', desc: 'Mock prep' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setLevel(lvl.id as RoadmapLevel)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        level === lvl.id
                          ? 'bg-[#0F1E36] text-[#F59E0B] border-[#0F1E36] shadow-xs'
                          : 'bg-[#FBF9F5] text-[#475569] border-[#0F1E36]/15 hover:border-[#0F1E36]/30'
                      }`}
                    >
                      <div className="text-xs font-bold">{lvl.label}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Weekly Hours Commitment */}
              <div>
                <label className="block text-xs font-bold text-[#0F1E36] mb-1.5 flex items-center justify-between">
                  <span>3. Weekly Study Time</span>
                  <span className="text-[10px] font-mono text-[#D97706]">
                    {commitment === 'part_time' ? '~10 hrs/week' : '~18 hrs/week'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCommitment('part_time')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      commitment === 'part_time'
                        ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                        : 'bg-[#FBF9F5] text-[#475569] border-[#0F1E36]/15'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#F59E0B]" /> Part-Time
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">8–10 hrs/wk (Working/Uni)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommitment('full_time')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      commitment === 'full_time'
                        ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                        : 'bg-[#FBF9F5] text-[#475569] border-[#0F1E36]/15'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" /> Intensive
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">16–20 hrs/wk (Dedicated)</div>
                  </button>
                </div>
              </div>

              {/* 4. Target Timeline */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#0F1E36] mb-1.5">
                  <span>4. Target Duration</span>
                  <span className="font-mono text-[#D97706]">{weeks} Weeks</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={24}
                  step={2}
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                  className="w-full accent-[#D97706]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#64748B] mt-1">
                  <span>6 wks (Sprint)</span>
                  <span>12 wks (Standard)</span>
                  <span>24 wks (Deep)</span>
                </div>
              </div>

              {/* 5. Pre-Existing Skills */}
              <div>
                <label className="block text-xs font-bold text-[#0F1E36] mb-2">
                  5. Skills you already master (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {currentRole.skills.map((s) => {
                    const on = known.includes(s.name);
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() =>
                          setKnown((p) => (on ? p.filter((x) => x !== s.name) : [...p, s.name]))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
                          on
                            ? 'bg-[#0F1E36] text-[#F59E0B] border-[#0F1E36]'
                            : 'bg-[#FBF9F5] text-[#475569] border-[#0F1E36]/12'
                        }`}
                      >
                        {on ? '✓ ' : '+ '}{s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate Action Button */}
              <button
                type="button"
                onClick={generatePlan}
                className="btn-yv-primary w-full justify-center cursor-pointer !py-3 text-xs font-bold"
              >
                <Sparkles className="w-4 h-4" />{' '}
                <span>{plan ? 'Regenerate Curriculum' : 'Generate Real Detailed Roadmap'}</span>
              </button>
            </div>
          </div>

          {/* Right Detailed Curriculum Viewer */}
          <div className="lg:col-span-7 rounded-3xl bg-[#0F1E36] text-white p-6 sm:p-8 border border-[#F59E0B]/35 shadow-2xl neo-silk-tessellation-dark">
            {!plan ? (
              <div className="py-20 text-center text-slate-300 text-sm space-y-3">
                <Compass className="w-10 h-10 text-[#F59E0B] mx-auto opacity-70" />
                <div className="font-display font-bold text-lg text-white">
                  Real, Fair & Detailed Career Roadmaps
                </div>
                <p className="max-w-md mx-auto text-xs text-slate-400">
                  Select your target role and starting level, then generate a multi-phase curriculum complete with concrete deliverables, verified free resources, and mentor tips.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header: Overview & Stats */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#F59E0B]">
                      {currentRole.label.toUpperCase()} • {level.toUpperCase()} TRACK ({weeks} WEEKS)
                    </div>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="font-mono font-extrabold text-3xl text-white">
                        {progress.pct}%
                      </span>
                      <span className="text-xs text-slate-400">
                        ({progress.done} of {progress.total} milestones completed)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyMarkdownPlan}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 cursor-pointer transition-all"
                    >
                      {copiedPlan ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#F59E0B]" /> Copy Markdown
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={resetPlan}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Estimated Time Left */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-slate-300">
                    <span>Curriculum Completion</span>
                    <span className="text-[#F59E0B]">~{progress.hoursLeft} hours remaining</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#F59E0B] via-[#D97706] to-[#C25E38] transition-all duration-500"
                      style={{ width: `${progress.pct}%` }}
                    />
                  </div>
                </div>

                {/* Detailed Week Cards Accordion */}
                <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
                  {plan.map((week) => {
                    const isExpanded = expandedWeeks[week.weekNum] ?? false;
                    const weekDoneCount = week.tasks.filter((t) => doneTasks[t.id]).length;
                    const isWeekComplete = weekDoneCount === week.tasks.length && week.tasks.length > 0;

                    return (
                      <div
                        key={week.weekNum}
                        className={`rounded-2xl border transition-all ${
                          isWeekComplete
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-white/[0.04] border-white/10 hover:border-[#F59E0B]/35'
                        }`}
                      >
                        {/* Week Card Header / Toggle */}
                        <div
                          onClick={() => toggleWeekExpand(week.weekNum)}
                          className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded-md ${
                                isWeekComplete
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-[#F59E0B]/20 text-amber-200'
                              }`}
                            >
                              WEEK {week.weekNum}
                            </span>
                            <div>
                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                <span>{week.title}</span>
                                {isWeekComplete && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 inline shrink-0" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {week.phaseTitle} • {week.focusArea}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                              {weekDoneCount}/{week.tasks.length} tasks
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Week Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 space-y-3.5 border-t border-white/5 text-xs">
                            {/* Objective & Concrete Deliverable */}
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                              <div>
                                <span className="font-mono text-[10px] uppercase font-bold text-[#F59E0B] mr-2">
                                  OBJECTIVE:
                                </span>
                                <span className="text-slate-200">{week.objective}</span>
                              </div>
                              <div>
                                <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 mr-2">
                                  DELIVERABLE:
                                </span>
                                <span className="text-emerald-200 font-medium">
                                  {week.deliverable}
                                </span>
                              </div>
                            </div>

                            {/* Verified Free Learning Resources */}
                            {week.resources.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-[#F59E0B]" />
                                  <span>VERIFIED CURATED RESOURCES:</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {week.resources.map((r, i) => (
                                    <div
                                      key={i}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-slate-200"
                                    >
                                      <span className="text-[#F59E0B] font-bold">[{r.type}]</span>
                                      <span className="font-semibold">{r.name}</span>
                                      <span className="text-slate-400 text-[10px]">({r.provider})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actionable Sub-Milestones Checkboxes */}
                            <div className="space-y-2 pt-1">
                              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                                WEEKLY MILESTONES:
                              </div>
                              <div className="space-y-2">
                                {week.tasks.map((task) => {
                                  const isTaskDone = Boolean(doneTasks[task.id]);
                                  return (
                                    <button
                                      key={task.id}
                                      type="button"
                                      onClick={() => toggleTask(task.id)}
                                      className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                        isTaskDone
                                          ? 'bg-emerald-500/10 border-emerald-400/30'
                                          : 'bg-white/[0.03] border-white/10 hover:border-[#F59E0B]/40'
                                      }`}
                                    >
                                      {isTaskDone ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                      ) : (
                                        <Circle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                      )}
                                      <div>
                                        <div
                                          className={`font-semibold text-xs text-white ${
                                            isTaskDone ? 'line-through opacity-70' : ''
                                          }`}
                                        >
                                          {task.label}
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                          {task.detail}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Pro Mentor Tip */}
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200/95 flex items-start gap-2.5 text-[11px] leading-relaxed">
                              <Sparkles className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-[#F59E0B] mr-1.5">Rahnamo Mentor Advice:</span>
                                <span>{week.mentorAdvice}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Mentor Session Pairing Footer */}
                <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-300">
                    Want an engineering lead to review your weekly deliverables 1-on-1?
                  </span>
                  <a
                    href="#rahnamolar"
                    className="inline-flex items-center gap-1.5 font-bold text-[#F59E0B] hover:text-white transition-colors"
                  >
                    <span>Match with a {currentRole.label} Rahnamo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
