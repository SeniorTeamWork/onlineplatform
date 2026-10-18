import * as D from './domain.js';
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const assert = (condition, message = 'Ruxsat berilmagan.') => {
  if (!condition) throw Error(message);
};
export function view(d, user) {
  const out = structuredClone(d);
  out.users.forEach(u => delete u.password);
  if (user.role === 'admin') return out;
  const id = user.id,
    ids = new Set(D.enrollmentsFor(d, id).map(e => e.courseId));
  out.users = out.users.filter(u => u.id === id);
  out.users.forEach(u => delete u.notes);
  out.enrollments = out.enrollments.filter(e => e.userId === id);
  out.courses = out.courses.filter(c => ids.has(c.id));
  out.lessons = out.lessons.filter(l => ids.has(l.courseId) && l.published && !l.archived).map(l => {
    const open = D.unlocked(d, id, l.id);
    return {
      ...l,
      video: open ? l.video : '',
      fileId: open ? l.fileId : '',
      task: open ? l.task : '',
      materials: open ? l.materials : [],
      questions: open ? l.questions.map(({
        correct,
        ...q
      }) => q) : []
    };
  });
  for (const key of ['payments', 'attempts', 'submissions', 'certificates', 'tickets']) out[key] = out[key].filter(x => x.userId === id);
  out.attempts.forEach(a => a.questions?.forEach(q => delete q.correct));
  out.progress = {
    [id]: out.progress[id] || {}
  };
  out.testSessions = Object.fromEntries(Object.entries(out.testSessions).filter(([, s]) => s.userId === id));
  Object.values(out.testSessions).forEach(s => s.questions.forEach(q => delete q.correct));
  out.expenses = [];
  return out;
}
function additions(old, items) {
  assert(Array.isArray(items));
  assert(old.every(x => items.some(y => y.id === x.id)), 'Tarixni o‘chirib bo‘lmaydi.');
  assert(new Set(items.map(x => x.id)).size === items.length, 'Takroriy ID');
  return items.filter(x => !old.some(y => y.id === x.id));
}
function stable(old, items) {
  for (const x of old) assert(equal(x, items.find(y => y.id === x.id)), 'Saqlangan tarix o‘zgartirilmaydi.');
}
export function applyUpdate(d, user, next) {
  const base = view(d, user),
    changed = Object.keys(base).filter(k => !equal(base[k], next[k]));
  const allowed = user.role === 'admin' ? ['courses', 'lessons', 'enrollments', 'payments', 'submissions', 'tickets', 'testSessions', 'expenses'] : ['testSessions', 'attempts', 'progress', 'submissions', 'tickets', 'certificates'];
  assert(changed.every(k => allowed.includes(k)), 'Bu ma’lumotni o‘zgartirish mumkin emas.');
  const id = user.id;
  if (user.role === 'admin') {
    if (changed.includes('courses')) {
      additions(d.courses, next.courses);
      for (const c of next.courses) {
        assert(c.title?.trim().length >= 2);
        D.integer(c.price);
      }
      d.courses = next.courses;
    }
    if (changed.includes('lessons')) {
      additions(d.lessons, next.lessons);
      for (const l of next.lessons) {
        assert(d.courses.some(c => c.id === l.courseId));
        const old = d.lessons.find(x => x.id === l.id);
        assert(!old || old.courseId === l.courseId);
        assert(l.title?.trim() && Array.isArray(l.questions));
        assert(!l.video || l.video.startsWith('https://'));
        for (const q of l.questions) assert(q.text?.trim() && q.options?.length >= 2 && Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length);
        assert(!l.published || l.questions.length > 0);
      }
      d.lessons = next.lessons;
    }
    if (changed.includes('enrollments')) {
      assert(d.enrollments.length === next.enrollments.length);
      for (const e of next.enrollments) {
        const old = d.enrollments.find(x => x.id === e.id);
        assert(old && equal({
          ...old,
          fee: e.fee
        }, e));
        assert(D.integer(e.fee) >= D.enrollmentSummary(d, old).paid);
        old.fee = e.fee;
      }
    }
    if (changed.includes('payments')) {
      const added = additions(d.payments, next.payments);
      for (const p of d.payments) {
        const n = next.payments.find(x => x.id === p.id);
        if (!equal(p, n)) {
          assert(!p.voidedAt && n.voidedAt && n.voidReason?.trim().length >= 5);
          assert(equal({
            ...p,
            voidedAt: n.voidedAt,
            voidReason: n.voidReason,
            voidedBy: n.voidedBy
          }, n));
          Object.assign(p, {
            voidedAt: new Date().toISOString(),
            voidReason: n.voidReason,
            voidedBy: id
          });
        }
      }
      for (const p of added) {
        assert(!p.voidedAt);
        D.addPayment(d, {
          ...p,
          createdBy: id
        });
      }
    }
    if (changed.includes('submissions')) {
      assert(d.submissions.length === next.submissions.length);
      for (const s of d.submissions) {
        const n = next.submissions.find(x => x.id === s.id);
        if (!equal(s, n)) D.reviewPractice(d, s.id, n.status, n.grade, n.feedback, id);
      }
    }
    if (changed.includes('tickets')) {
      assert(d.tickets.length === next.tickets.length);
      for (const t of d.tickets) {
        const n = next.tickets.find(x => x.id === t.id);
        assert(n && equal({
          ...t,
          reply: n.reply
        }, n));
        t.reply = String(n.reply).slice(0, 10000);
      }
    }
    if (changed.includes('testSessions')) for (const [key, s] of Object.entries(d.testSessions)) {
      if (!next.testSessions[key]) {
        const l = d.lessons.find(l => l.id === s.lessonId);
        assert(!l?.published || l?.archived);
        delete d.testSessions[key];
      } else assert(equal(s, next.testSessions[key]));
    }
    if (changed.includes('expenses')) {
      const added = additions(d.expenses || [], next.expenses);
      stable(d.expenses || [], next.expenses);
      for (const e of added) {
        D.integer(e.amount, 1);
        assert(e.title?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.date <= D.localDate() && new Date(e.date + 'T00:00:00Z').toISOString().slice(0, 10) === e.date);
        d.expenses.push({
          ...e,
          createdBy: id,
          createdAt: new Date().toISOString()
        });
      }
    }
    return d;
  }
  if (changed.includes('progress')) {
    assert(Object.keys(next.progress).every(k => k === id));
    const old = d.progress[id] || {},
      n = next.progress[id] || {};
    for (const [lid, p] of Object.entries(old)) assert(equal(p, n[lid]) || n[lid]?.watched);
    for (const [lid, p] of Object.entries(n)) if (!equal(p, old[lid])) {
      assert(D.unlocked(d, id, lid));
      assert(p.watched === true);
      d.progress[id] ??= {};
      d.progress[id][lid] = {
        watched: true,
        watchedAt: new Date().toISOString()
      };
    }
  }
  if (changed.includes('attempts')) {
    const added = additions(base.attempts, next.attempts);
    stable(base.attempts, next.attempts);
    for (const a of added) {
      assert(a.userId === id);
      const s = d.testSessions[id + ':' + a.lessonId];
      assert(s && s.id === a.id);
      D.recordAttempt(d, s, a.answers);
    }
  }
  if (changed.includes('testSessions')) {
    for (const [key, n] of Object.entries(next.testSessions)) {
      assert(n.userId === id && key === id + ':' + n.lessonId && D.unlocked(d, id, n.lessonId));
      const existing = d.testSessions[key];
      if (existing) {
        assert(existing.id === n.id);
        for (const [qid, value] of Object.entries(n.answers)) {
          const q = existing.questions.find(q => q.id === qid);
          assert(q && Number.isInteger(value) && value >= 0 && value < q.options.length);
        }
        existing.answers = n.answers;
      } else {
        assert(!d.attempts.some(a => a.id === n.id));
        const l = d.lessons.find(l => l.id === n.lessonId);
        assert(l.questions.length);
        d.testSessions[key] = {
          id: n.id,
          userId: id,
          lessonId: l.id,
          courseId: l.courseId,
          lessonTitle: l.title,
          startedAt: new Date().toISOString(),
          questions: structuredClone(l.questions),
          answers: {}
        };
      }
    }
    for (const [key, s] of Object.entries(base.testSessions)) if (!next.testSessions[key]) assert(d.attempts.some(a => a.id === s.id), 'Testni faqat topshirish orqali tugating.');
  }
  if (changed.includes('submissions')) {
    const added = additions(base.submissions, next.submissions);
    stable(base.submissions, next.submissions);
    for (const s of added) {
      assert(s.userId === id);
      const l = d.lessons.find(l => l.id === s.lessonId);
      D.submitPractice(d, {
        id: s.id,
        userId: id,
        lessonId: l.id,
        courseId: l.courseId,
        lessonTitle: l.title,
        answer: s.answer,
        attachment: s.attachment
      });
    }
  }
  if (changed.includes('tickets')) {
    const added = additions(base.tickets, next.tickets);
    stable(base.tickets, next.tickets);
    for (const t of added) {
      assert(t.userId === id && t.message?.trim());
      d.tickets.unshift({
        id: t.id,
        userId: id,
        subject: String(t.subject).slice(0, 200),
        message: String(t.message).slice(0, 10000),
        reply: '',
        createdAt: new Date().toISOString()
      });
    }
  }
  if (changed.includes('certificates')) {
    const added = additions(base.certificates, next.certificates);
    stable(base.certificates, next.certificates);
    for (const c of added) {
      assert(c.userId === id);
      D.issueCertificate(d, id, c.courseId);
    }
  }
  return d;
}
export function mayReadFile(d, u, path) {
  if (u.role === 'admin') return true;
  if (u.avatarId === path) return true;
  if (d.submissions.some(s => s.userId === u.id && s.attachment?.fileId === path)) return true;
  return d.lessons.some(l => (l.fileId === path || l.materials?.some(m => m.fileId === path)) && D.unlocked(d, u.id, l.id));
}
