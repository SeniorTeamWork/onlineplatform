# AI Academy v6 — Supabasega qadamma-qadam ulash

Bu ZIPda frontend va server kodi birga. V5.1 sahifalari, marshrutlari, JSX/CSS joylashuvi saqlangan. Endi `REACT_APP_DATA_MODE=supabase` bilan haqiqiy Auth, server API va Storage ishlatiladi. URL/key kiritmasdan va SQL/Edge Functionni joylamasdan onlayn rejim ishlamaydi.

## 1. Papkani oching

ZIPni oching, VS Code orqali `ai-academy-cra` papkasini oching. Terminal `package.json` joylashgan papkada bo‘lsin. Node.js 22 yoki yangi versiya ishlating.

```powershell
npm install
```

## 2. Supabase loyihasi

https://supabase.com/dashboard → New project → `ai-academy`. Database parolini o‘zingizda saqlang. Quyidagilar kerak bo‘ladi:
- Project URL: `https://PROJECT_REF.supabase.co`
- Publishable key: `sb_publishable_...`
- Project ref: URLdagi `PROJECT_REF` qismi.

Auth → Providers/Sign In sozlamalarida Email login yoqilgan bo‘lsin. Ochiq ro‘yxatdan o‘tishni o‘chirish mumkin: talabani admin yaratadi. Auth → URL Configuration: Site URLga Vercel domeningizni, Redirect URLsga `http://localhost:3000` va Vercel domeningizni kiriting.

## 3. Baza va Storage — SQL Editor

Supabase → SQL Editor → New query.

`supabase/schema.sql` faylini to‘liq nusxalab, SQL Editorga qo‘ying → Run.

`supabase/migrations/202610180001_academy.sql` shu sxemaning aynan nusxasi. Manual SQL usulida ikkalasini alohida bajarish shart emas. Oldingi v5.1 sxemasi bajarilgan bo‘lsa ham bu migratsiya eski jadvallarni o‘chirmaydi. V6 boshqa `academy_state`, `academy_audit` jadvallaridan foydalanadi.

Yaratiladi:
- `academy_state`: kurslar, talabalar profillari, enrollmentlar, to‘lovlar, xarajatlar, test sessiyalari/natijalari, amaliy ishlar, progress, sertifikatlar va murojaatlar JSONB hujjati.
- `academy_audit`: serverdagi yozish amallari tarixi — foydalanuvchi, amal, revision, vaqt.
- `academy-media`: admin yuklaydigan video/materiallar, private, 200 MBgacha.
- `academy-student-media`: o‘quvchi rasmi/amaliy fayllari, private, 20 MBgacha.

Loyiha tarifidagi global Storage hajmi/limitlari ham amal qiladi. Video formati MP4 yoki WebM. Profil rasmi interfeysda 3 MB bilan cheklangan. Yuklash vaqtida internet barqaror bo‘lsin; bu versiya standard signed upload ishlatadi, resumable/TUS hali qo‘shilmagan.

## 4. Birinchi adminni yarating

Supabase → Authentication → Users → Add user/Create user orqali o‘zingizning emailingiz va kuchli parolingiz bilan foydalanuvchi yarating. Emailni tasdiqlang/auto-confirmni belgilang.

`supabase/BOOTSTRAP-ADMIN.sql`ni oching. `YOUR_ADMIN_EMAIL`ni aynan o‘sha emailga almashtiring. SQL Editorda bajaring.

Endi ushbu Auth hisobida admin roli mavjud. Demo `admin@academy.uz / Admin123!` avtomatik yaratilmaydi. Ikkinchi admin kerak bo‘lsa, boshqa Auth hisobini yarating va shu bootstrapni o‘sha email bilan bajaring.

## 5. Edge Functionni deploy qiling

Quyidagi buyruqlar VS Code terminalida, `package.json` yonida bajariladi:

```powershell
npx supabase login
npx supabase functions deploy academy --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

`YOUR_PROJECT_REF`ni o‘zingizning loyiha identifikatoringizga almashtiring. CLI login brauzer orqali o‘z Supabase hisobingizga kirishni so‘raydi. Deploydan so‘ng Dashboard → Edge Functions ichida `academy` ko‘rinadi.

`--no-verify-jwt` API ochiq degani emas: funksiyaning boshida har bir so‘rov JWTsi `auth.getUser(token)` bilan tekshiriladi, so‘ng rol va faol holat tekshiriladi. Token bo‘lmasa yozish ham, o‘qish ham ishlamaydi.

Supabase hosted Edge Functionda `SUPABASE_URL` va `SUPABASE_SERVICE_ROLE_KEY` server muhiti orqali olinadi. Ular brauzerga uzatilmaydi. Agar hosting muhitida ushbu server kaliti mavjud bo‘lmasa, Edge Function secretsni Supabase hujjatiga muvofiq sozlang; uni CRA `.env`ga qo‘ymang.

## 6. Frontend `.env`

`package.json` yonida `.env.example`dan nusxa oling:

```powershell
Copy-Item .env.example .env
```

`.env` ichida:

```env
REACT_APP_DATA_MODE=supabase
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Keyin:

```powershell
npm start
```

Login sahifasiga 4-qadamdagi haqiqiy admin email/parolini kiriting. `.env` o‘zgarsa serverni Ctrl+C orqali to‘xtatib, qayta ishga tushiring.

## 7. Admin orqali tekshiring

1. Kurs yarating va narx kiriting.
2. Birinchi/ikkinchi darsni yarating, testlari va videolarini qo‘shing, e’lon qiling.
3. Talaba qo‘shing. Email noyob, boshlang‘ich parol kamida 8 belgi; kurslarni checkbox bilan tanlang. Holat: Faol/Nofaol/Depozit.
4. Boshlang‘ich to‘lovsiz talaba hisobida faqat birinchi dars ochilishini tekshiring.
5. Admin talaba + kursni tanlab qisman to‘lov kiritsin. Qarz kamayadi; keyingi dars oldingi video yakunlangach va test >70% bo‘lgach ochiladi.
6. O‘quvchi yangi brauzer yoki inkognito oynada kirsin: fayllar va natijalar u yerda ham ko‘rinishi kerak.
7. Amaliy ish yuboring, admin baholasin; barcha natijalar talaba sahifasida qoladi.
8. Moliya ichida chiqim qo‘shing. Kirim, chiqim, qoldiq hisoblanadi. To‘lovlar faqat admin tomonidan kiritiladi, bank integratsiyasi yo‘q.
9. Profilni o‘zgartiring. Email almashsa, Supabase yuborgan tasdiqlash xatini bajaring. Parollar bazadagi profilga yozilmaydi; admin talaba sahifasidan yangi parol belgilashi mumkin.
10. Barcha dars/video/test/amaliy shartlar bajarilgach sertifikatni yuklang.

Boshqa hisobdagi o‘zgarishni olish uchun sahifani yangilang. Realtime obuna yo‘q. Parallel yozishda revision tekshiruvi eski ma’lumot bilan yangisini bosib ketishga yo‘l qo‘ymaydi: xabar chiqadi, yangilangan ma’lumot keladi, amalni qayta yuborasiz. Hamma to‘lov/holat bir tranzaksiyada saqlanadi. Auth foydalanuvchini yaratish alohida xizmat bo‘lgani uchun, DB saqlash xatosida yangi Auth hisobini o‘chirish kompensatsiyasi ishlatiladi.

## 8. Vercel

GitHubga `.env`, `node_modules`, `build`ni yubormang. Vercel → Settings → Environment Variablesga 6-qadamdagi uchta qiymatni kiriting. Framework Create React App, Build Command `npm run build`, Output `build`. Keyin Redeploy.

Supabase Functionni deploy qilish bilan Vercel frontend deployi ikki alohida amal. Backendni yangilasangiz 5-qadamdagi function deploy buyrug‘ini qayta bajaring.

## Fayllar xaritasi

| Fayl | Vazifa |
|---|---|
| `src/services/supabase.js` | Auth client, sessiya saqlash |
| `src/services/cloud.js` | Edge API va private fayllar |
| `src/context/AppContext.jsx` | Cloud/demo rejim, async saqlash |
| `src/services/db.js` | Interfeys hisoblari va demo yordamchilari |
| `supabase/functions/academy/index.ts` | JWT/rol, Auth admin, upload/media, tranzaksiya |
| `supabase/functions/_shared/logic.js` | Ruxsat, server baholash, filtrlangan ma’lumot |
| `supabase/functions/_shared/domain.js` | Serverdagi biznes qoidalari |
| `supabase/schema.sql` | Ishlaydigan backend uchun SQL |
| `supabase/BOOTSTRAP-ADMIN.sql` | Birinchi adminni bog‘lash |

## Saqlash arxitekturasi va tekshiruv chegarasi

V6 mavjud frontend modelini saqlash uchun barcha biznes metama’lumotlarni bitta server-only JSONB hujjatida saqlaydi. Brauzer bu jadvalga to‘g‘ridan-to‘g‘ri kira olmaydi: RLS yoqilgan va anon/authenticated huquqlari olib tashlangan. Edge Function o‘quvchiga faqat o‘z ma’lumotlarini beradi. To‘g‘ri test javoblari va yopiq dars fayllari talaba javobiga kirmaydi. Fayllarning o‘zi Storage, parollar esa Authda.

Bu kichik platforma uchun boshlang‘ich backend; juda ko‘p talabalar va katta tarixda hujjatni to‘liq o‘qish/yozish qimmatlashadi. Shunda alohida relational jadvallar, pagination va alohida tranzaksiyalarga ajratish kerak bo‘ladi. Eski localStorage/IndexedDB ma’lumotlari avtomatik import qilinmaydi. Eski brauzer ma’lumotlarini o‘chirmang; kurslar/fayllarni admin orqali qayta kiriting yoki alohida migratsiya yozing.

62 ta biznes qoida, 17 ta server ruxsat/baholash testi, 14 ta React testi va production build tekshirilgan. Sizning Supabase loyihangizga kirish yo‘qligi sababli SQLni real bazada bajarish, Edge deploy, haqiqiy Auth/Storage va ikki brauzerli end-to-end tekshiruv hali bajarilmagan. 7-qadamni real loyiha ochilgach bajaring. Brauzerda screenshot/screen recordingni mutlaq bloklash imkoni yo‘q; video watermark va odatiy download cheklovi saqlangan.

## Test buyruqlari

```powershell
npm run test:domain
npm run test:server
npm test -- --watch=false --runInBand
npm run build
```

Faqat eski demo ko‘rinishini ochish uchun `.env`da `REACT_APP_DATA_MODE=demo` yozing. Bu rejim haqiqiy bazaga yozmaydi.

## Rasmiy manbalar

- https://supabase.com/docs/guides/functions/deploy
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/guides/storage/buckets/fundamentals
