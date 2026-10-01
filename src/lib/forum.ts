import { ForumQuestion, ForumAnswer } from '@/types';

interface ForumQuestionRow {
  id: string;
  student_name_or_anonymous: string;
  email?: string;
  category: string;
  title: string;
  body: string;
  created_at: string;
}

interface ForumAnswerRow {
  id: string;
  question_id: string;
  counselor_id: string;
  body: string;
  created_at: string;
  counselor?: { full_name: string } | Array<{ full_name: string }> | null;
}

export function mapForumQuestion(q: ForumQuestionRow): ForumQuestion {
  return {
    id: q.id,
    studentNameOrAnonymous: q.student_name_or_anonymous,
    email: q.email || '',
    category: q.category,
    title: q.title,
    body: q.body,
    createdAt: q.created_at,
  };
}

export function mapForumAnswer(a: ForumAnswerRow): ForumAnswer {
  const counselor = Array.isArray(a.counselor) ? a.counselor[0] : a.counselor;
  return {
    id: a.id,
    questionId: a.question_id,
    counselorId: a.counselor_id,
    body: a.body,
    createdAt: a.created_at,
    counselorName: counselor?.full_name,
  };
}
