'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import {
  isSupabaseConfigured,
  mapForumQuestion,
  mapForumAnswer,
  loadLocalForumQuestions,
  loadLocalForumAnswers,
} from '@/lib/forum';
import { ForumQuestion, ForumAnswer } from '@/types';
import {
  MessageCircleQuestion,
  Send,
  ChevronDown,
  AlertCircle,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

const CATEGORY_KEYS = Object.keys(SPECIALTY_CONFIG).filter((k) => k !== 'All');

export default function ForumPage() {
  const [questions, setQuestions] = useState<ForumQuestion[]>([]);
  const [answers, setAnswers] = useState<ForumAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  // Ask-a-question form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState(CATEGORY_KEYS[0]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Inline "answer this" mini-forms, keyed by question id
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<{ [questionId: string]: { counselorId: string; body: string } }>({});
  const [answerErrors, setAnswerErrors] = useState<{ [questionId: string]: string }>({});

  // Pure .then()/.catch() chains, not async/await — every branch's setState
  // calls need to sit inside a Promise callback, not just after an await
  // inside a function the effect calls directly, for React's
  // set-state-in-effect check to recognize them as genuinely deferred.
  const loadData = () => {
    if (isSupabaseConfigured()) {
      Promise.all([
        supabase.from('forum_questions').select('*').order('created_at', { ascending: false }),
        supabase.from('forum_answers').select('*').order('created_at', { ascending: true }),
      ])
        .then(([{ data: qData, error: qErr }, { data: aData, error: aErr }]) => {
          if (qErr || aErr) throw qErr || aErr;
          setQuestions((qData || []).map(mapForumQuestion));
          setAnswers((aData || []).map(mapForumAnswer));
        })
        .catch((err) => {
          console.warn('Forum fetch error, falling back to local storage:', err);
          setQuestions(loadLocalForumQuestions());
          setAnswers(loadLocalForumAnswers());
        })
        .finally(() => setLoading(false));
    } else {
      Promise.resolve().then(() => {
        setQuestions(loadLocalForumQuestions());
        setAnswers(loadLocalForumAnswers());
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const validateQuestion = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim() || title.trim().length < 5) {
      newErrors.title = "Savol sarlavhasini kiriting (kamida 5 ta belgi).";
    }
    if (!body.trim() || body.trim().length < 10) {
      newErrors.body = "Savolingizni biroz batafsilroq yozing.";
    }
    if (!isAnonymous && (!name.trim() || name.trim().length < 2)) {
      newErrors.name = "Ismingizni kiriting yoki anonim postlashni tanlang.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = "To'g'ri elektron pochta manzilini kiriting.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateQuestion()) return;
    setSubmitting(true);

    const newQuestion: ForumQuestion = {
      id: crypto.randomUUID(),
      studentNameOrAnonymous: isAnonymous ? 'Anonim' : name.trim(),
      email: email.trim(),
      category,
      title: title.trim(),
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('forum_questions').insert({
        id: newQuestion.id,
        student_name_or_anonymous: newQuestion.studentNameOrAnonymous,
        email: newQuestion.email,
        category: newQuestion.category,
        title: newQuestion.title,
        body: newQuestion.body,
      });
      if (error) console.warn('Forum question insert error:', error);
    }

    try {
      const existing = loadLocalForumQuestions();
      localStorage.setItem('rahnamo_forum_questions', JSON.stringify([newQuestion, ...existing]));
    } catch (err) {
      console.error(err);
    }

    setQuestions((prev) => [newQuestion, ...prev]);
    setTitle('');
    setBody('');
    setName('');
    setEmail('');
    setIsAnonymous(false);
    setErrors({});
    setSubmitting(false);
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 4000);
  };

  const handleSubmitAnswer = async (questionId: string) => {
    const draft = answerDrafts[questionId];
    if (!draft?.counselorId || !draft.body?.trim() || draft.body.trim().length < 5) {
      setAnswerErrors((prev) => ({
        ...prev,
        [questionId]: "Rahnamoni tanlang va javobingizni yozing (kamida 5 ta belgi).",
      }));
      return;
    }

    const newAnswer: ForumAnswer = {
      id: crypto.randomUUID(),
      questionId,
      counselorId: draft.counselorId,
      body: draft.body.trim(),
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('forum_answers').insert({
        id: newAnswer.id,
        question_id: newAnswer.questionId,
        counselor_id: newAnswer.counselorId,
        body: newAnswer.body,
      });
      if (error) console.warn('Forum answer insert error:', error);
    }

    try {
      const existing = loadLocalForumAnswers();
      localStorage.setItem('rahnamo_forum_answers', JSON.stringify([...existing, newAnswer]));
    } catch (err) {
      console.error(err);
    }

    setAnswers((prev) => [...prev, newAnswer]);
    setAnswerDrafts((prev) => ({ ...prev, [questionId]: { counselorId: '', body: '' } }));
    setAnswerErrors((prev) => ({ ...prev, [questionId]: '' }));
    setAnsweringId(null);
  };

  const sortedQuestions = [...questions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/10 border border-amber-900/15 text-amber-950 text-xs font-bold mb-3">
            <MessageCircleQuestion className="w-4 h-4 text-amber-800" />
            <span>Rahnamodan So&apos;rang</span>
          </div>
          <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-amber-950">
            Kasbiy savollaringizga ochiq javoblar
          </h1>
          <p className="text-xs text-stone-600 mt-2 max-w-xl mx-auto">
            Savolingizni yozing — istalgan Rahnamo unga ommaviy javob beradi, va javob hamma uchun ko&apos;rinadi.
            Ro&apos;yxatdan o&apos;tish shart emas.
          </p>
        </div>

        {/* Ask a question */}
        <form
          onSubmit={handleSubmitQuestion}
          className="bg-white/95 rounded-3xl border border-amber-900/15 shadow-sm p-6 sm:p-8 space-y-4 mb-10"
        >
          <h2 className="font-serif text-lg font-bold text-amber-950">Savol berish</h2>

          <div>
            <label htmlFor="forum-title" className="text-xs font-semibold text-stone-700 block">
              Savol sarlavhasi *
            </label>
            <input
              id="forum-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="Masalan: Germaniyada ordinaturaga qanday hujjatlar kerak?"
              className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                errors.title ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
              }`}
            />
            {errors.title && <p className="text-[11px] text-red-600 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="forum-category" className="text-xs font-semibold text-stone-700 block">
              Yo&apos;nalish *
            </label>
            <select
              id="forum-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700 text-stone-800 cursor-pointer"
            >
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SPECIALTY_CONFIG[key].icon} {SPECIALTY_CONFIG[key].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="forum-body" className="text-xs font-semibold text-stone-700 block">
              Savolingiz *
            </label>
            <textarea
              id="forum-body"
              rows={4}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (errors.body) setErrors((prev) => ({ ...prev, body: '' }));
              }}
              placeholder="Vaziyatingizni va aniq nimani bilmoqchi ekaningizni yozing..."
              className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                errors.body ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
              }`}
            />
            {errors.body && <p className="text-[11px] text-red-600 mt-1">{errors.body}</p>}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="forum-anonymous"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="accent-amber-800 cursor-pointer"
            />
            <label htmlFor="forum-anonymous" className="text-xs font-semibold text-stone-700 cursor-pointer">
              Anonim postlash
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isAnonymous && (
              <div>
                <label htmlFor="forum-name" className="text-xs font-semibold text-stone-700 block">
                  Ismingiz *
                </label>
                <input
                  id="forum-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Masalan: Sardor"
                  className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                    errors.name ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                  }`}
                />
                {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
              </div>
            )}

            <div className={isAnonymous ? 'sm:col-span-2' : ''}>
              <label htmlFor="forum-email" className="text-xs font-semibold text-stone-700 block">
                Elektron pochta *
              </label>
              <input
                id="forum-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="ism@domain.com"
                className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                  errors.email ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                }`}
              />
              {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
              <p className="text-[10px] text-stone-400 mt-1">
                Faqat moderatsiya uchun — hech qachon ommaviy ko&apos;rsatilmaydi.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Yuborilmoqda...' : 'Savolni joylash'}</span>
          </button>

          {justSubmitted && (
            <p className="text-[11px] text-emerald-700 font-semibold text-center">
              Savolingiz joylandi! Rahnamolar tez orada javob berishadi.
            </p>
          )}
        </form>

        {/* Question list */}
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-bold text-amber-950 flex items-center gap-2">
            <span>So&apos;nggi savollar</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-mono">
              {sortedQuestions.length}
            </span>
          </h2>

          {loading ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
              <p className="text-xs text-stone-500">Yuklanmoqda...</p>
            </div>
          ) : sortedQuestions.length === 0 ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
              <MessageCircleQuestion className="w-10 h-10 text-stone-400 mx-auto mb-3" />
              <h4 className="font-serif font-bold text-base text-amber-950">Hali savollar yo&apos;q</h4>
              <p className="text-xs text-stone-500 mt-1">Birinchi bo&apos;lib savol bering!</p>
            </div>
          ) : (
            sortedQuestions.map((q) => {
              const questionAnswers = answers.filter((a) => a.questionId === q.id);
              const cfg = SPECIALTY_CONFIG[q.category];
              const isAnswering = answeringId === q.id;
              const draft = answerDrafts[q.id] || { counselorId: '', body: '' };

              return (
                <div key={q.id} className="bg-white/95 rounded-3xl border border-amber-900/15 shadow-sm p-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    {cfg && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.inactiveClass}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    )}
                    <span className="text-[10px] text-stone-400 flex items-center gap-1">
                      <UserRound className="w-3 h-3" />
                      {q.studentNameOrAnonymous}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-amber-950 mt-2">{q.title}</h3>
                  <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{q.body}</p>

                  {/* Answers */}
                  {questionAnswers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-amber-900/10 space-y-3">
                      {questionAnswers.map((a) => {
                        const responder = INITIAL_COUNSELORS.find((c) => c.id === a.counselorId);
                        return (
                          <div key={a.id} className="bg-amber-50/60 border border-amber-900/10 rounded-xl p-3.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 fill-amber-100" />
                              <span>{responder?.fullName || 'Rahnamo'}</span>
                            </div>
                            <p className="text-xs text-stone-700 mt-1.5 leading-relaxed">{a.body}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Answer this */}
                  <div className="mt-4 pt-3 border-t border-amber-900/10">
                    {isAnswering ? (
                      <div className="space-y-2.5">
                        <select
                          value={draft.counselorId}
                          onChange={(e) =>
                            setAnswerDrafts((prev) => ({ ...prev, [q.id]: { ...draft, counselorId: e.target.value } }))
                          }
                          className="w-full p-2.5 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700 cursor-pointer"
                        >
                          <option value="">Rahnamoni tanlang...</option>
                          {INITIAL_COUNSELORS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.fullName}
                            </option>
                          ))}
                        </select>
                        <textarea
                          rows={2}
                          value={draft.body}
                          onChange={(e) =>
                            setAnswerDrafts((prev) => ({ ...prev, [q.id]: { ...draft, body: e.target.value } }))
                          }
                          placeholder="Javobingizni yozing..."
                          className="w-full p-2.5 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                        />
                        {answerErrors[q.id] && (
                          <p className="text-[11px] text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {answerErrors[q.id]}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSubmitAnswer(q.id)}
                            className="px-3.5 py-2 rounded-xl bg-amber-900 text-amber-50 text-xs font-bold hover:bg-amber-800 transition-colors cursor-pointer"
                          >
                            Javobni joylash
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnsweringId(null)}
                            className="px-3.5 py-2 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200 transition-colors cursor-pointer"
                          >
                            Bekor qilish
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAnsweringId(q.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        Rahnamo sifatida javob berish
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
