import { ForumQuestion, ForumAnswer } from '@/types';

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes('placeholder');
}

interface ForumQuestionRow {
  id: string;
  student_name_or_anonymous: string;
  email: string;
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
}

export function mapForumQuestion(q: ForumQuestionRow): ForumQuestion {
  return {
    id: q.id,
    studentNameOrAnonymous: q.student_name_or_anonymous,
    email: q.email,
    category: q.category,
    title: q.title,
    body: q.body,
    createdAt: q.created_at,
  };
}

export function mapForumAnswer(a: ForumAnswerRow): ForumAnswer {
  return {
    id: a.id,
    questionId: a.question_id,
    counselorId: a.counselor_id,
    body: a.body,
    createdAt: a.created_at,
  };
}

export function loadLocalForumQuestions(): ForumQuestion[] {
  try {
    return JSON.parse(localStorage.getItem('rahnamo_forum_questions') || '[]');
  } catch {
    return [];
  }
}

export function loadLocalForumAnswers(): ForumAnswer[] {
  try {
    return JSON.parse(localStorage.getItem('rahnamo_forum_answers') || '[]');
  } catch {
    return [];
  }
}
