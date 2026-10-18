import { cloudEnabled, uploadCloudFile, cloudFile } from './cloud';
export const KEY = "ai-academy-v1";
export const uid = () => crypto.randomUUID();
export const money = n => new Intl.NumberFormat("uz-UZ").format(n) + " so‘m";
export const localDate = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
export function integer(value, min = 0) {
  const n = Number(value);
  if (value === "" || !Number.isSafeInteger(n) || n < min || n > 1e12) throw Error("Miqdorni to‘g‘ri butun son sifatida kiriting.");
  return n;
}
export const seed = {
  courses: [{
    id: "course-ai",
    title: "Sun’iy intellekt asoslari",
    price: 0,
    description: "AI Foundation"
  }],
  users: [{
    id: "admin",
    name: "Sayyorbek",
    email: "admin@academy.uz",
    password: "Admin123!",
    role: "admin",
    active: true
  }, {
    id: "student",
    courseId: "course-ai",
    name: "Abdullayev Behzod",
    email: "student@academy.uz",
    password: "Student123!",
    role: "student",
    active: true
  }],
  lessons: [["Kirish darsi: AI nima?", "Sun’iy intellekt bilan tanishing", 12, "AI yordamida o‘zingizni tanishtiruvchi prompt yozing."], ["Prompt yozish asoslari", "Aniq savol — yaxshi natija", 15, "Maqsad, kontekst va formatdan iborat prompt yozing."], ["AI yordamida matn yaratish", "G‘oyalarni so‘zlarga aylantiring", 18, "AI yordamida mahsulot uchun qisqa matn tayyorlang."], ["Rasm generatsiya qilish", "Tasavvuringizga shakl bering", 20, "Rasm yaratish uchun batafsil prompt tuzing."], ["Amaliy loyiha: Mini chatbot", "Birinchi loyihangizni yarating", 25, "Chatbot loyihangiz va ishlash tartibini tushuntiring."]].map((x, i) => ({
    id: "lesson-" + i,
    courseId: "course-ai",
    title: x[0],
    description: x[1],
    duration: x[2],
    task: x[3],
    video: "",
    fileId: "",
    published: true,
    questions: [{
      id: "q-" + i,
      text: i === 0 ? "AI nimani anglatadi?" : "Yaxshi prompt nimadan boshlanadi?",
      options: i === 0 ? ["Sun’iy intellekt", "Internet tezligi", "Kompyuter xotirasi", "Dastur hajmi"] : ["Aniq maqsaddan", "Tasodifiy so‘zlardan", "Faqat emojidan", "Bo‘sh matndan"],
      correct: 0
    }]
  })),
  progress: {},
  submissions: [],
  attempts: [],
  tickets: [],
  payments: [],
  testSessions: {}
};
export function migrate(input) {
  const d = {
    ...structuredClone(seed),
    ...input
  };
  d.courses ??= structuredClone(seed.courses);
  d.payments ??= [];
  d.expenses ??= [];
  d.testSessions ??= {};
  d.certificates ??= [];
  d.lessons = d.lessons.map(l => ({
    courseId: "course-ai",
    materials: [],
    ...l
  }));
  if (!Array.isArray(d.enrollments)) d.enrollments = d.users.filter(u => u.role === "student").map(u => ({
    id: u.id + ":" + (u.courseId || "course-ai"),
    userId: u.id,
    courseId: u.courseId || "course-ai",
    fee: Number(u.courseFee ?? d.courses.find(c => c.id === (u.courseId || "course-ai"))?.price ?? 0),
    createdAt: u.createdAt || new Date().toISOString()
  }));
  d.payments = d.payments.map(a => ({
    ...a,
    courseId: a.courseId || d.users.find(u => u.id === a.userId)?.courseId || "course-ai"
  }));
  d.attempts = d.attempts.map(a => ({
    ...a,
    courseId: a.courseId || d.lessons.find(l => l.id === a.lessonId)?.courseId || "course-ai"
  }));
  d.submissions = d.submissions.map(a => ({
    ...a,
    courseId: a.courseId || d.lessons.find(l => l.id === a.lessonId)?.courseId || "course-ai",
    reviews: a.reviews || [],
    lessonTitle: a.lessonTitle || d.lessons.find(l => l.id === a.lessonId)?.title || "Eski dars"
  }));
  d.schemaVersion = 5;
  return d;
}
export function read() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return migrate(structuredClone(seed));
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw Error("Saqlangan ma’lumot buzilgan. Brauzer ma’lumotlarini o‘chirmang; zaxiradan tiklang.");
  }
  if (!Array.isArray(value.users) || !Array.isArray(value.lessons)) throw Error("Ma’lumot tuzilmasi noto‘g‘ri.");
  return migrate(value);
}
export function write(d) {
  localStorage.setItem(KEY, JSON.stringify(d));
}
export function enrollmentsFor(d, userId) {
  return d.enrollments.filter(e => e.userId === userId);
}
export function hasCourse(d, userId, courseId) {
  return d.enrollments.some(e => e.userId === userId && e.courseId === courseId);
}
export function studentLessons(d, userId, courseId) {
  const ids = enrollmentsFor(d, userId).map(e => e.courseId);
  return d.lessons.filter(l => ids.includes(l.courseId) && (!courseId || l.courseId === courseId));
}
export function attemptPassed(a) {
  return a.total > 0 && Number.isInteger(a.correctCount) ? a.correctCount * 100 > a.total * 70 : a.score > 70;
}
export function passed(d, userId, lessonId) {
  return d.attempts.some(a => a.userId === userId && a.lessonId === lessonId && attemptPassed(a));
}
export const completed = passed;
export function accessState(d, e) {
  const summary = enrollmentSummary(d, e);
  return summary.debt === 0 ? 'active' : summary.paid > 0 ? 'deposit' : 'trial';
}
export function unlocked(d, userId, lessonId) {
  const lesson = d.lessons.find(l => l.id === lessonId),
    user = d.users.find(u => u.id === userId);
  if (!user?.active || !lesson?.published || lesson.archived) return false;
  const e = d.enrollments.find(e => e.userId === userId && e.courseId === lesson.courseId);
  if (!e) return false;
  const list = d.lessons.filter(l => l.courseId === lesson.courseId && l.published && !l.archived),
    i = list.findIndex(l => l.id === lessonId);
  if (i === 0) return true;
  if (e.fee > 0 && enrollmentSummary(d, e).paid <= 0) return false;
  return list.slice(0, i).every(l => d.progress[userId]?.[l.id]?.watched && passed(d, userId, l.id));
}
export function gradeAttempt(session, answers) {
  if (!session.questions.length) throw Error("Savollar yo‘q.");
  if (session.questions.some(q => !Number.isInteger(answers[q.id]) || answers[q.id] < 0 || answers[q.id] >= q.options.length)) throw Error("Barcha savollarga javob bering.");
  const correctCount = session.questions.filter(q => answers[q.id] === q.correct).length;
  return {
    ...session,
    answers: {
      ...answers
    },
    correctCount,
    total: session.questions.length,
    score: correctCount / session.questions.length * 100,
    createdAt: new Date().toISOString()
  };
}
export function recordAttempt(d, session, answers) {
  if (d.attempts.some(a => a.id === session.id)) return;
  const key = session.userId + ":" + session.lessonId;
  if (d.testSessions[key]?.id !== session.id) throw Error("Test sessiyasi o‘zgargan.");
  if (!unlocked(d, session.userId, session.lessonId)) throw Error("Dars yopilgan.");
  d.attempts.push(gradeAttempt(session, answers));
  delete d.testSessions[key];
}
export function enrollmentSummary(d, e) {
  const paid = d.payments.filter(p => p.userId === e.userId && p.courseId === e.courseId && !p.voidedAt).reduce((n, p) => n + p.amount, 0);
  return {
    fee: e.fee,
    paid,
    debt: Math.max(0, e.fee - paid),
    credit: Math.max(0, paid - e.fee)
  };
}
export function paymentSummary(d, user) {
  return enrollmentsFor(d, user.id).reduce((out, e) => {
    const s = enrollmentSummary(d, e);
    for (const k of Object.keys(out)) out[k] += s[k];
    return out;
  }, {
    fee: 0,
    paid: 0,
    debt: 0,
    credit: 0
  });
}
export function saveStudent(d, draft, selected) {
  const email = draft.email.trim().toLowerCase(),
    name = draft.name.trim();
  if (name.length < 3 || !/^\S+@\S+\.\S+$/.test(email) || draft.password.length < 8) throw Error("Ism, email va kamida 8 belgili parol kiriting.");
  if (d.users.some(u => u.id !== draft.id && u.email.toLowerCase() === email)) throw Error("Email band.");
  const ids = [...new Set(selected)];
  if (!ids.length || ids.some(id => !d.courses.some(c => c.id === id))) throw Error("Kamida bitta mavjud kursni tanlang.");
  for (const e of enrollmentsFor(d, draft.id).filter(e => !ids.includes(e.courseId))) {
    if (d.payments.some(p => p.userId === draft.id && p.courseId === e.courseId) || d.attempts.some(a => a.userId === draft.id && a.courseId === e.courseId) || d.submissions.some(a => a.userId === draft.id && a.courseId === e.courseId) || d.certificates.some(c => c.userId === draft.id && c.courseId === e.courseId) || d.lessons.some(l => l.courseId === e.courseId && d.progress[draft.id]?.[l.id]?.watched)) throw Error("Tarixi yoki to‘lovi bor kursni olib tashlab bo‘lmaydi.");
  }
  d.enrollments = d.enrollments.filter(e => e.userId !== draft.id || ids.includes(e.courseId));
  for (const id of ids) if (!hasCourse(d, draft.id, id)) d.enrollments.push({
    id: uid(),
    userId: draft.id,
    courseId: id,
    fee: integer(d.courses.find(c => c.id === id).price),
    createdAt: new Date().toISOString()
  });
  const old = d.users.find(u => u.id === draft.id);
  const value = {
    ...draft,
    name,
    email,
    role: "student"
  };
  if (old) Object.assign(old, value);else d.users.push(value);
}
export function addPayment(d, p) {
  if (d.payments.some(x => x.id === p.id)) return;
  const e = d.enrollments.find(e => e.userId === p.userId && e.courseId === p.courseId);
  if (!e) throw Error("Talaba kursga biriktirilmagan.");
  const amount = integer(p.amount, 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || p.date > localDate() || new Date(p.date + "T00:00:00Z").toISOString().slice(0, 10) !== p.date) throw Error("To‘lov sanasi noto‘g‘ri.");
  if (amount > enrollmentSummary(d, e).debt) throw Error("To‘lov qolgan qarzdan oshmasligi kerak.");
  d.payments.push({
    ...p,
    amount,
    createdAt: new Date().toISOString()
  });
}
export function submitPractice(d, s) {
  if (d.submissions.some(x => x.id === s.id)) return;
  if (!unlocked(d, s.userId, s.lessonId)) throw Error("Darsga kirish yopilgan.");
  if (s.answer.trim().length < 5) throw Error("Kamida 5 belgi yozing.");
  if (d.submissions.some(x => x.userId === s.userId && x.lessonId === s.lessonId && x.status === "pending")) throw Error("Oldingi vazifa tekshirilmoqda.");
  d.submissions.push({
    ...s,
    answer: s.answer.trim(),
    status: "pending",
    reviews: [],
    createdAt: new Date().toISOString()
  });
}
export function reviewPractice(d, id, status, grade, feedback, adminId) {
  if (!["approved", "rejected"].includes(status)) throw Error("Natija holati noto‘g‘ri.");
  const s = d.submissions.find(s => s.id === id);
  if (!s || s.status !== "pending") throw Error("Bu vazifa avval tekshirilgan.");
  const score = integer(grade);
  if (score > 100) throw Error("Baho 0–100 oralig‘ida bo‘lsin.");
  Object.assign(s, {
    status,
    grade: score,
    feedback,
    reviewedAt: new Date().toISOString()
  });
  s.reviews.push({
    status,
    grade: score,
    feedback,
    adminId,
    createdAt: s.reviewedAt
  });
}
export function courseResult(d, userId, courseId) {
  const lessons = d.lessons.filter(l => l.courseId === courseId && l.published);
  const scores = lessons.map(l => Math.max(0, ...d.attempts.filter(a => a.userId === userId && a.lessonId === l.id).map(a => a.score)));
  const tests = lessons.filter(l => passed(d, userId, l.id)).length;
  const watched = lessons.filter(l => d.progress[userId]?.[l.id]?.watched).length;
  const practical = lessons.filter(l => d.submissions.some(s => s.userId === userId && s.lessonId === l.id && s.status === "approved")).length;
  return {
    lessons,
    tests,
    watched,
    practical,
    average: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    ready: hasCourse(d, userId, courseId) && lessons.length > 0 && tests === lessons.length && watched === lessons.length && practical === lessons.length
  };
}
export function issueCertificate(d, userId, courseId) {
  const existing = d.certificates.find(c => c.userId === userId && c.courseId === courseId);
  if (existing) return existing;
  const r = courseResult(d, userId, courseId);
  if (!r.ready) throw Error("Kurs shartlari hali bajarilmagan.");
  const cert = {
    id: uid(),
    userId,
    courseId,
    name: d.users.find(u => u.id === userId).name,
    title: d.courses.find(c => c.id === courseId).title,
    score: r.average,
    createdAt: new Date().toISOString(),
    lessonCount: r.lessons.length
  };
  d.certificates.push(cert);
  return cert;
}
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open("academy-media", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("files");
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
export async function putFile(file) {
  if (cloudEnabled) return uploadCloudFile(file);
  const db = await open();
  const id = uid();
  return new Promise((res, rej) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(file, id);
    tx.oncomplete = () => {
      db.close();
      res(id);
    };
    tx.onerror = () => {
      db.close();
      rej(tx.error);
    };
  });
}
export async function getFile(id) {
  if (cloudEnabled) return cloudFile(id);
  const db = await open();
  return new Promise((res, rej) => {
    const r = db.transaction("files").objectStore("files").get(id);
    r.onsuccess = () => {
      db.close();
      res(r.result);
    };
    r.onerror = () => {
      db.close();
      rej(r.error);
    };
  });
}
export async function downloadMaterial(m) {
  const blob = await getFile(m.fileId);
  if (!blob) throw Error("Fayl shu brauzerda topilmadi. Admin qayta yuklasin.");
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = m.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
export function saveStudentWithPayment(d, draft, selected, settings, adminId) {
  const previous = new Set(enrollmentsFor(d, draft.id).map(e => e.courseId));
  saveStudent(d, draft, selected);
  for (const courseId of selected) {
    if (previous.has(courseId)) continue;
    const e = d.enrollments.find(e => e.userId === draft.id && e.courseId === courseId),
      config = settings[courseId] || {
        mode: 'trial'
      };
    let amount = 0;
    if (config.mode === 'active') amount = e.fee;else if (config.mode === 'deposit') {
      amount = integer(config.amount, 1);
      if (amount >= e.fee) throw Error('Depozit kurs narxidan kichik bo‘lsin. To‘liq to‘lov uchun “To‘langan”ni tanlang.');
    }
    if (amount) addPayment(d, {
      id: uid(),
      userId: draft.id,
      courseId,
      amount,
      date: localDate(),
      method: config.method || 'Naqd',
      createdBy: adminId,
      note: 'Talaba qo‘shilganda qabul qilingan to‘lov'
    });
  }
}
export function updateProfile(d, id, fields, currentPassword) {
  const u = d.users.find(u => u.id === id);
  if (!u || u.password !== currentPassword) throw Error('Joriy parol noto‘g‘ri.');
  const name = fields.name.trim(),
    email = fields.email.trim().toLowerCase(),
    phone = (fields.phone || '').trim();
  if (name.length < 3 || !/^\S+@\S+\.\S+$/.test(email)) throw Error('Ism va emailni to‘g‘ri kiriting.');
  if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone)) throw Error('Telefon raqamini tekshiring.');
  if (d.users.some(x => x.id !== id && x.email.toLowerCase() === email)) throw Error('Bu login band.');
  if (fields.password && fields.password.length < 8) throw Error('Yangi parol kamida 8 belgi bo‘lsin.');
  Object.assign(u, {
    name,
    email,
    phone,
    ...(fields.password ? {
      password: fields.password
    } : {}),
    ...(fields.avatarId ? {
      avatarId: fields.avatarId
    } : {})
  });
}
export function periodStatistics(d, days) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  const buckets = Array.from({
    length: days
  }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    return {
      date: key,
      amount: 0,
      count: 0
    };
  });
  for (const p of d.payments) {
    const b = buckets.find(b => b.date === p.date);
    if (b && !p.voidedAt) {
      b.amount += p.amount;
      b.count++;
    }
  }
  return {
    buckets,
    total: buckets.reduce((s, b) => s + b.amount, 0),
    count: buckets.reduce((s, b) => s + b.count, 0),
    from: buckets[0].date,
    to: buckets.at(-1).date
  };
}
