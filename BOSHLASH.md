# AI Academy — .env + supabase.js bilan ulash

Bu papkada oldingi sayt sahifalari, dizayni, JSX/CSS, marshrutlari va biznes qoidalari saqlangan. Ulanish konfiguratsiyasi faqat .env va src/supabase.js orqali ishlaydi. JSON konfiguratsiyasi olib tashlangan.

## 1. Asosiy papka

VS Code’da ichida package.json, .env, src va supabase mavjud bo‘lgan ai-academy-cra papkasini oching. .env fayli tayyor qo‘shilgan.

## 2. .env

```env
REACT_APP_DATA_MODE=supabase
REACT_APP_SUPABASE_URL=https://hbxnamucmrbzcyfdxznz.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=
```

Oxirgi qatorda = belgisidan keyin aynan shu loyihaning Publishable key qiymatini yozing. Secret/service_role key va database parolini frontendga yozmang. Login va parol .env ga kiritilmaydi, ular Supabase Authentication hisobiga tegishli.

Eski .env.local, .env.development.local yoki .env.production.local ichida boshqa URL/key bo‘lsa ular CRA tartibiga ko‘ra ustun turishi mumkin. Shu fayllarni ham aynan ushbu loyiha qiymatlariga moslang. Terminalda ilgari belgilangan environment qiymatlari ham ustun turishi mumkin. REACT_APP_SUPABASE_ANON_KEY nomi legacy anon key uchun moslik sifatida qo‘llab-quvvatlanadi; tavsiya etilgan nom yuqorida.

## 3. Terminal

```bash
npm install
npm run check:supabase
npm start
```

.env o‘zgargach Ctrl+C qilib serverni to‘xtating va yana npm start qiling. Brauzer ochgan localhost:3000 yoki 3001 manzilidan foydalaning. Vercel majburiy emas.

## 4. Qaysi fayl nima qiladi

- .env: URL va Publishable key.
- src/supabase.js: yagona createClient, sozlama tekshiruvi, sessiyani saqlash va tokenni yangilash.
- src/services/supabase.js: eski importlar uchun o‘sha clientni qayta eksport qiladi; ikkinchi client yaratilmaydi.
- src/services/cloud.js: mavjud academy backendiga so‘rov, video/material yuklash va o‘qish.
- src/context/AppContext.jsx: mavjud login, saqlash va rollarni boshqarish.

## 5. Mavjud Supabase bazasi

Oldingi SQL bajarilgan bo‘lsa ma’lumotlarni tozalash shart emas. SQL sxema va backend kodi o‘zgarmadi.

Yangi bazada supabase/schema.sql ni SQL Editor’da bajaring. Authentication → Users orqali adminni yarating va tasdiqlang. supabase/BOOTSTRAP-ADMIN.sql ichidagi YOUR_ADMIN_EMAIL ni o‘sha email bilan almashtirib bajaring. Ro‘yxatdan o‘tgan adminni takroran qo‘shmang.

## 6. academy funksiyasi

.env bilan Supabase clientini yaratish backendni avtomatik joylamaydi. Mavjud funksiyalarimiz shu backenddan foydalanadi. academy allaqachon aynan shu loyihaga joylangan bo‘lsa qaytadan deploy shart emas.

Siz yuborgan sahifada funksiya hali yo‘q edi. Bir marta quyidagilarni terminalda bajaring:

```bash
npx supabase login
npx supabase projects list
npx supabase functions deploy academy --project-ref hbxnamucmrbzcyfdxznz --no-verify-jwt
```

Login qilganda kerakli Google/Supabase hisobini tanlang. projects list ichida hbxnamucmrbzcyfdxznz ko‘rinishi kerak. Boshqa hisobga kirgan bo‘lsangiz npx supabase logout qilib, kerakli hisob bilan qayta login qiling. Function o‘z kodida har bir so‘rov tokeni, rol va active holatini tekshiradi.

## 7. Xatolarni ajratish

- Sozlamalar xatosi: .env to‘ldirilganini tekshiring va serverni qayta yoqing.
- Invalid login credentials: aynan ushbu loyihadagi Auth email/parolini kiriting.
- Failed to send a request to the Edge Function: Network’da academy so‘rovini tekshiring. Oldingi tekshiruvda bu loyiha 404 Requested function was not found qaytargan; buning yechimi yuqoridagi backend deploy.
- Hisob faol emas yoki biriktirilmagan: admin bootstrap yoki talaba biriktirishini tekshiring.

## 8. Vercel

Settings → Environment Variables ichiga yuqoridagi uchta qiymatni kiriting, keyin Redeploy qiling. .env gitignore’da, uni GitHubga push qilmang. Build Command npm run build, Output Directory build. JSON yoki JS ichiga kalit yozish kerak emas.

## 9. Ishlashni tekshirish

Haqiqiy admin bilan login qiling. Kurs, talaba, to‘lov yarating va sahifani yangilang. O‘quvchi hisobida dars/video/test/amaliyot/materiallarni tekshiring. Baza va Storage’dagi yozuvlar saqlanganini tekshiring.

Eski localStorage ma’lumotlari avtomatik import qilinmaydi. Haqiqiy Publishable key taqdim etilmaganligi sabab ZIPda bo‘sh. Sizning loyihangizga bu ZIP avtomatik deploy qilinmagan va jonli Auth/SQL/Storage end-to-end sinovi hali bajarilmagan.
