import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { AppProvider } from "../context/AppContext";
import { KEY, seed, migrate } from "../services/db";
jest.mock("../services/certificate", () => ({
  downloadCertificate: jest.fn().mockResolvedValue(undefined)
}));
let host, root, data;
beforeEach(async () => {
  jest.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  data = migrate(structuredClone(seed));
  data.courses.push({
    id: "react",
    title: "React kursi",
    price: 500000,
    description: "React o‘rganish"
  });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  jest.useRealTimers();
});
async function render(route, user = "admin") {
  localStorage.setItem(KEY, JSON.stringify(data));
  localStorage.setItem("academy-user", user);
  await act(async () => root.render(<MemoryRouter initialEntries={[route]}>
        <AppProvider>
          <App />
        </AppProvider>
      </MemoryRouter>));
  await act(async () => jest.advanceTimersByTime(1000));
}
async function button(text) {
  const el = [...host.querySelectorAll("button")].find(e => e.textContent === text);
  if (!el) throw Error("Button not found: " + text);
  await act(async () => el.click());
}
async function input(el, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", {
      bubbles: true
    }));
  });
}
test("both roles confirm log out; cancel preserves session, yes returns to login", async () => {
  await render("/student", "student");
  expect(host.textContent).toContain("Mening kurslarim");
  await button(" Log out");
  expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  await button("Yo‘q, qolaman");
  expect(localStorage.getItem("academy-user")).toBe("student");
  await button(" Log out");
  await button("Ha, chiqish");
  expect(localStorage.getItem("academy-user")).toBeNull();
  expect(host.textContent).toContain("Tizimga kirish");
});
test("admin creates student with two checked courses and opens personal page", async () => {
  await render("/admin/students");
  await button("+ Talaba qo‘shish");
  const dialog = host.querySelector('[role="dialog"]');
  const fields = dialog.querySelectorAll("input");
  await act(async () => {
    const status = dialog.querySelector('select[aria-label="Talaba holati"]');
    status.value = 'deposit';
    status.dispatchEvent(new Event('change', {
      bubbles: true
    }));
  });
  await input(fields[0], "Ikki Kurs Talaba");
  await input(fields[1], "ikki@test.uz");
  await input(fields[2], "Password123");
  await act(async () => dialog.querySelectorAll('input[type="checkbox"]').forEach(c => c.click()));
  await act(async () => dialog.querySelector("form").dispatchEvent(new Event("submit", {
    bubbles: true,
    cancelable: true
  })));
  expect(host.textContent).toContain("Ma’lumot va kurslarni tahrirlash");
  const saved = JSON.parse(localStorage.getItem(KEY));
  const student = saved.users.find(u => u.email === "ikki@test.uz");
  expect(student.accessMode).toBe("deposit");
  expect(student.active).toBe(true);
  expect(saved.enrollments.filter(e => e.userId === student.id)).toHaveLength(2);
  expect(host.textContent).toContain("React kursi");
});
test("student sees only enrolled courses; lesson has three tabs", async () => {
  await render("/student/lesson/lesson-0", "student");
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(3);
  await button("3. Qo‘shimcha materiallar");
  expect(host.textContent).toContain("Hozircha material yuklanmagan.");
  await button("2. Amaliy");
  expect(host.textContent).toContain("Amaliy ishni topshirish");
  expect(host.querySelector(".subnav").textContent).not.toContain("React kursi");
});
test("finance debtor button displays all debtors and personal links", async () => {
  data.enrollments[0].fee = 600000;
  await render("/admin/finance");
  const el = [...host.querySelectorAll("button")].find(e => e.textContent.includes("Qarzdorlar"));
  await act(async () => el.click());
  expect(host.textContent).toContain("Barcha qarzdorlar");
  expect(host.querySelector('a[href="/admin/students/student"]')).not.toBeNull();
  expect(host.textContent).toContain("600");
});
test("admin logout uses same confirmation", async () => {
  await render("/admin");
  await button(" Log out");
  expect(host.textContent).toContain("Hisobdan chiqmoqchimisiz?");
});
test('dashboard payment modal records payment and refreshes balance', async () => {
  data.enrollments[0].fee = 600000;
  await render('/admin');
  const trigger = [...host.querySelectorAll('button')].find(e => e.textContent.includes('To‘lov qo‘shish'));
  await act(async () => trigger.click());
  const dialog = host.querySelector('[role="dialog"]');
  async function select(el, value) {
    await act(async () => {
      el.value = value;
      el.dispatchEvent(new Event('change', {
        bubbles: true
      }));
    });
  }
  await select(dialog.querySelectorAll('select')[0], 'student');
  await select(dialog.querySelectorAll('select')[1], 'course-ai');
  await input(dialog.querySelector('input[name="amount"]'), '100000');
  await act(async () => dialog.querySelector('form').dispatchEvent(new Event('submit', {
    bubbles: true,
    cancelable: true
  })));
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(JSON.parse(localStorage.getItem(KEY)).payments[0].amount).toBe(100000);
  expect(host.textContent).toContain('To‘lov saqlandi.');
});
test('dashboard courses card opens searchable modal and allows editing', async () => {
  await render('/admin');
  const trigger = [...host.querySelectorAll('button')].find(e => e.textContent.includes('Kurslar ('));
  await act(async () => trigger.click());
  const dialog = host.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain('Kurslarni boshqarish');
  await input(dialog.querySelector('input[aria-label="Kurslarni qidirish"]'), 'React');
  expect(dialog.querySelectorAll('.course-manage-card')).toHaveLength(1);
  await act(async () => dialog.querySelector('.course-manage-card button').click());
  const title = dialog.querySelector('form input');
  await input(title, 'React yangi nom');
  await act(async () => dialog.querySelector('form').dispatchEvent(new Event('submit', {
    bubbles: true,
    cancelable: true
  })));
  expect(dialog.textContent).toContain('React yangi nom');
  expect(JSON.parse(localStorage.getItem(KEY)).courses.find(c => c.id === 'react').title).toBe('React yangi nom');
});
test('portal waits one second before rendering admin content', async () => {
  localStorage.setItem(KEY, JSON.stringify(data));
  localStorage.setItem('academy-user', 'admin');
  await act(async () => root.render(<MemoryRouter initialEntries={['/admin']}><AppProvider><App /></AppProvider></MemoryRouter>));
  expect(host.textContent).toContain('Ma’lumotlar yuklanmoqda');
  await act(async () => jest.advanceTimersByTime(999));
  expect(host.querySelector('.topbar')).toBeNull();
  await act(async () => jest.advanceTimersByTime(1));
  expect(host.querySelector('.topbar')).not.toBeNull();
});
test('one course auto-opens and multiple courses show chooser', async () => {
  await render('/student', 'student');
  expect(host.querySelector('.course-hero')).not.toBeNull();
});
test('multiple enrolled courses show chooser', async () => {
  data.enrollments.push({
    id: 'e2',
    userId: 'student',
    courseId: 'react',
    fee: 500000
  });
  await render('/student', 'student');
  expect(host.querySelectorAll('.course-card')).toHaveLength(2);
  expect(host.textContent).toContain('Davom etish uchun kursni tanlang.');
});
test('certificates appear together with separate download buttons', async () => {
  data.enrollments.push({
    id: 'e2',
    userId: 'student',
    courseId: 'react',
    fee: 500000
  });
  await render('/student/certificate', 'student');
  expect(host.querySelectorAll('.cert-item')).toHaveLength(2);
  expect(host.querySelectorAll('.cert-actions button')).toHaveLength(2);
});
test('profile page exposes photo and credential fields', async () => {
  await render('/student/profile', 'student');
  expect(host.querySelector('input[type="file"]')).not.toBeNull();
  expect(host.querySelector('input[name="current"]')).not.toBeNull();
  expect(host.querySelector('input[name="phone"]')).not.toBeNull();
});
