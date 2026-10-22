import * as D from "./domain.js";

const equal = (a, b) =>
  JSON.stringify(a) === JSON.stringify(b);

const assert = (
  condition,
  message = "Ruxsat berilmagan."
) => {
  if (!condition) {
    throw new Error(message);
  }
};

export function view(d, user) {
  const out = structuredClone(d);

  out.users.forEach((account) => {
    delete account.password;
  });

  if (user.role === "admin") {
    return out;
  }

  const id = user.id;

  const courseIds = new Set(
    D.enrollmentsFor(d, id).map(
      (enrollment) => enrollment.courseId
    )
  );

  out.users = out.users.filter(
    (account) => account.id === id
  );

  out.users.forEach((account) => {
    delete account.notes;
    delete account.adminNote;
    delete account.trialSeenIds;
  });

  out.enrollments = out.enrollments.filter(
    (enrollment) => enrollment.userId === id
  );

  out.courses = out.courses.filter(
    (course) => courseIds.has(course.id)
  );

  out.lessons = out.lessons
    .filter(
      (lesson) =>
        courseIds.has(lesson.courseId) &&
        lesson.published &&
        !lesson.archived
    )
    .map((lesson) => {
      const open = D.unlocked(d, id, lesson.id);

      return {
        ...lesson,
        video: open ? lesson.video : "",
        fileId: open ? lesson.fileId : "",
        task: open ? lesson.task : "",
        materials: open ? lesson.materials : [],
        questions: open
          ? lesson.questions.map(({ correct, ...question }) => question)
          : [],
      };
    });

  for (const key of [
    "payments",
    "attempts",
    "submissions",
    "certificates",
    "tickets",
  ]) {
    out[key] = out[key].filter(
      (item) => item.userId === id
    );
  }

  out.attempts.forEach((attempt) => {
    attempt.questions?.forEach((question) => {
      delete question.correct;
    });
  });

  out.progress = {
    [id]: out.progress[id] || {},
  };

  out.testSessions = Object.fromEntries(
    Object.entries(out.testSessions).filter(
      ([, session]) => session.userId === id
    )
  );

  Object.values(out.testSessions).forEach((session) => {
    session.questions.forEach((question) => {
      delete question.correct;
    });
  });

  out.expenses = [];

  return out;
}

function additions(old, items) {
  assert(Array.isArray(items));

  assert(
    old.every((item) =>
      items.some((next) => next.id === item.id)
    ),
    "Tarixni o‘chirib bo‘lmaydi."
  );

  assert(
    new Set(items.map((item) => item.id)).size === items.length,
    "Takroriy ID"
  );

  return items.filter(
    (item) => !old.some((previous) => previous.id === item.id)
  );
}

function stable(old, items) {
  for (const item of old) {
    assert(
      equal(
        item,
        items.find((next) => next.id === item.id)
      ),
      "Saqlangan tarix o‘zgartirilmaydi."
    );
  }
}

export function applyUpdate(d, user, next) {
  const base = view(d, user);

  const changed = Object.keys(base).filter(
    (key) => !equal(base[key], next[key])
  );

  const allowed =
    user.role === "admin"
      ? [
          "courses",
          "lessons",
          "enrollments",
          "payments",
          "submissions",
          "tickets",
          "testSessions",
          "expenses",
        ]
      : [
          "testSessions",
          "attempts",
          "progress",
          "submissions",
          "tickets",
          "certificates",
        ];

  assert(
    changed.every((key) => allowed.includes(key)),
    "Bu ma’lumotni o‘zgartirish mumkin emas."
  );

  const id = user.id;

  if (user.role === "admin") {
    if (changed.includes("courses")) {
      additions(d.courses, next.courses);

      for (const course of next.courses) {
        assert(course.title?.trim().length >= 2);
        D.integer(course.price);
      }

      d.courses = next.courses;
    }

    if (changed.includes("lessons")) {
      additions(d.lessons, next.lessons);

      for (const lesson of next.lessons) {
        assert(
          d.courses.some(
            (course) => course.id === lesson.courseId
          )
        );

        const old = d.lessons.find(
          (item) => item.id === lesson.id
        );

        assert(!old || old.courseId === lesson.courseId);

        assert(
          lesson.title?.trim() &&
            Array.isArray(lesson.questions)
        );

        assert(
          !lesson.video ||
            lesson.video.startsWith("https://")
        );

        for (const question of lesson.questions) {
          assert(
            question.text?.trim() &&
              question.options?.length >= 2 &&
              Number.isInteger(question.correct) &&
              question.correct >= 0 &&
              question.correct < question.options.length
          );
        }

        assert(
          !lesson.published || lesson.questions.length > 0
        );
      }

      d.lessons = next.lessons;
    }

    if (changed.includes("enrollments")) {
      assert(
        d.enrollments.length === next.enrollments.length
      );

      for (const enrollment of next.enrollments) {
        const old = d.enrollments.find(
          (item) => item.id === enrollment.id
        );

        assert(
          old &&
            equal(
              {
                ...old,
                fee: enrollment.fee,
              },
              enrollment
            )
        );

        assert(
          D.integer(enrollment.fee) >=
            D.enrollmentSummary(d, old).paid
        );

        old.fee = enrollment.fee;
      }
    }

    if (changed.includes("payments")) {
      const added = additions(d.payments, next.payments);

      for (const payment of d.payments) {
        const updated = next.payments.find(
          (item) => item.id === payment.id
        );

        if (!equal(payment, updated)) {
          assert(
            !payment.voidedAt &&
              updated.voidedAt &&
              updated.voidReason?.trim().length >= 5
          );

          assert(
            equal(
              {
                ...payment,
                voidedAt: updated.voidedAt,
                voidReason: updated.voidReason,
                voidedBy: updated.voidedBy,
              },
              updated
            )
          );

          Object.assign(payment, {
            voidedAt: new Date().toISOString(),
            voidReason: updated.voidReason,
            voidedBy: id,
          });
        }
      }

      for (const payment of added) {
        assert(!payment.voidedAt);

        D.addPayment(d, {
          ...payment,
          createdBy: id,
        });
      }
    }

    if (changed.includes("submissions")) {
      assert(
        d.submissions.length === next.submissions.length
      );

      for (const submission of d.submissions) {
        const updated = next.submissions.find(
          (item) => item.id === submission.id
        );

        if (!equal(submission, updated)) {
          D.reviewPractice(
            d,
            submission.id,
            updated.status,
            updated.grade,
            updated.feedback,
            id
          );
        }
      }
    }

    if (changed.includes("tickets")) {
      assert(d.tickets.length === next.tickets.length);

      for (const ticket of d.tickets) {
        const updated = next.tickets.find(
          (item) => item.id === ticket.id
        );

        assert(
          updated &&
            equal(
              {
                ...ticket,
                reply: updated.reply,
              },
              updated
            )
        );

        ticket.reply = String(updated.reply).slice(0, 10000);
      }
    }

    if (changed.includes("testSessions")) {
      for (const [key, session] of Object.entries(
        d.testSessions
      )) {
        if (!next.testSessions[key]) {
          const lesson = d.lessons.find(
            (item) => item.id === session.lessonId
          );

          assert(!lesson?.published || lesson?.archived);

          delete d.testSessions[key];
        } else {
          assert(equal(session, next.testSessions[key]));
        }
      }
    }

    if (changed.includes("expenses")) {
      const added = additions(
        d.expenses || [],
        next.expenses
      );

      stable(d.expenses || [], next.expenses);

      for (const expense of added) {
        D.integer(expense.amount, 1);

        assert(
          expense.title?.trim() &&
            /^\d{4}-\d{2}-\d{2}$/.test(expense.date) &&
            expense.date <= D.localDate() &&
            new Date(expense.date + "T00:00:00Z")
              .toISOString()
              .slice(0, 10) === expense.date
        );

        d.expenses.push({
          ...expense,
          createdBy: id,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return d;
  }

  if (changed.includes("progress")) {
    assert(
      Object.keys(next.progress).every((key) => key === id)
    );

    const old = d.progress[id] || {};
    const updated = next.progress[id] || {};

    for (const [lessonId, progress] of Object.entries(old)) {
      assert(
        equal(progress, updated[lessonId]) ||
          updated[lessonId]?.watched
      );
    }

    for (const [lessonId, progress] of Object.entries(updated)) {
      if (!equal(progress, old[lessonId])) {
        assert(D.unlocked(d, id, lessonId));
        assert(progress.watched === true);

        d.progress[id] ??= {};

        d.progress[id][lessonId] = {
          watched: true,
          watchedAt: new Date().toISOString(),
        };
      }
    }
  }

  if (changed.includes("attempts")) {
    const added = additions(base.attempts, next.attempts);

    stable(base.attempts, next.attempts);

    for (const attempt of added) {
      assert(attempt.userId === id);

      const session =
        d.testSessions[id + ":" + attempt.lessonId];

      assert(session && session.id === attempt.id);

      D.recordAttempt(d, session, attempt.answers);
    }
  }

  if (changed.includes("testSessions")) {
    for (const [key, updated] of Object.entries(
      next.testSessions
    )) {
      assert(
        updated.userId === id &&
          key === id + ":" + updated.lessonId &&
          D.unlocked(d, id, updated.lessonId)
      );

      const existing = d.testSessions[key];

      if (existing) {
        assert(existing.id === updated.id);

        for (const [questionId, value] of Object.entries(
          updated.answers
        )) {
          const question = existing.questions.find(
            (item) => item.id === questionId
          );

          assert(
            question &&
              Number.isInteger(value) &&
              value >= 0 &&
              value < question.options.length
          );
        }

        existing.answers = updated.answers;
      } else {
        assert(
          !d.attempts.some(
            (attempt) => attempt.id === updated.id
          )
        );

        const lesson = d.lessons.find(
          (item) => item.id === updated.lessonId
        );

        assert(lesson.questions.length);

        d.testSessions[key] = {
          id: updated.id,
          userId: id,
          lessonId: lesson.id,
          courseId: lesson.courseId,
          lessonTitle: lesson.title,
          startedAt: new Date().toISOString(),
          questions: structuredClone(lesson.questions),
          answers: {},
        };
      }
    }

    for (const [key, session] of Object.entries(
      base.testSessions
    )) {
      if (!next.testSessions[key]) {
        assert(
          d.attempts.some(
            (attempt) => attempt.id === session.id
          ),
          "Testni faqat topshirish orqali tugating."
        );
      }
    }
  }

  if (changed.includes("submissions")) {
    const added = additions(
      base.submissions,
      next.submissions
    );

    stable(base.submissions, next.submissions);

    for (const submission of added) {
      assert(submission.userId === id);

      const lesson = d.lessons.find(
        (item) => item.id === submission.lessonId
      );

      D.submitPractice(d, {
        id: submission.id,
        userId: id,
        lessonId: lesson.id,
        courseId: lesson.courseId,
        lessonTitle: lesson.title,
        answer: submission.answer,
        attachment: submission.attachment,
      });
    }
  }

  if (changed.includes("tickets")) {
    const added = additions(base.tickets, next.tickets);

    stable(base.tickets, next.tickets);

    for (const ticket of added) {
      assert(ticket.userId === id && ticket.message?.trim());

      d.tickets.unshift({
        id: ticket.id,
        userId: id,
        subject: String(ticket.subject).slice(0, 200),
        message: String(ticket.message).slice(0, 10000),
        reply: "",
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (changed.includes("certificates")) {
    const added = additions(
      base.certificates,
      next.certificates
    );

    stable(base.certificates, next.certificates);

    for (const certificate of added) {
      assert(certificate.userId === id);

      D.issueCertificate(d, id, certificate.courseId);
    }
  }

  return d;
}

export function mayReadFile(d, user, path) {
  if (user.role === "admin") {
    return true;
  }

  if (user.avatarId === path) {
    return true;
  }

  if (
    d.submissions.some(
      (submission) =>
        submission.userId === user.id &&
        submission.attachment?.fileId === path
    )
  ) {
    return true;
  }

  return d.lessons.some(
    (lesson) =>
      (lesson.fileId === path ||
        lesson.materials?.some(
          (material) => material.fileId === path
        )) &&
      D.unlocked(d, user.id, lesson.id)
  );
}

export function applyAdminAction(
  state,
  actor,
  action,
  body
) {
  assert(
    actor.role === "admin" && actor.active,
    "Faqat faol admin uchun."
  );

  if (action === "adminNote") {
    assert(
      typeof body.note === "string" &&
        body.note.length <= 5000,
      "Izoh 5000 belgidan oshmasin."
    );

    const target = state.users.find(
      (user) =>
        user.id === body.userId &&
        user.role === "student"
    );

    assert(target, "Talaba topilmadi.");

    target.adminNote = body.note.trim();
  } else if (action === "markTrialsSeen") {
    assert(
      Array.isArray(body.enrollmentIds),
      "Ro‘yxat noto‘g‘ri."
    );

    const valid = new Set(
      state.enrollments.map(
        (enrollment) => enrollment.id
      )
    );

    assert(
      body.enrollmentIds.every(
        (id) => typeof id === "string" && valid.has(id)
      ),
      "Kurs biriktirilishi topilmadi."
    );

    actor.trialSeenIds = [
      ...new Set([
        ...(actor.trialSeenIds || []),
        ...body.enrollmentIds,
      ]),
    ].filter((id) => valid.has(id));
  } else {
    throw new Error("Noma’lum admin amali.");
  }
}