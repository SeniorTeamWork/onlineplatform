# AI Academy CRA v6 — Supabase

V5.1 sahifalari, yo‘llari va dizayni saqlandi. Supabase Auth, server API, private Storage, admin to‘lovlari, kirim/chiqim, serverda test baholash va foydalanuvchi ruxsatlari qo‘shildi.

**Boshlash: `README-SUPABASE.md`ni 1-qadamdan bajaring.** SQL + birinchi admin + Edge Function deploy + `.env` kerak. Supabase hali sizning loyihangizga deploy qilinmagan.

```bash
npm install
npm start
```

Frontend: React 18 / CRA / react-router-dom. JSX va CSS alohida. `.env.example`dan `.env` yarating. Maxfiy/service-role kalitlarini Reactga qo‘ymang.

`TOLIQ-KODLAR.md`da frontend kodlari, `supabase/` ichida server kodlari bor. Node modules va build ZIPga qo‘shilmagan.

Demo uchun `REACT_APP_DATA_MODE=demo`: admin@academy.uz / Admin123!, student@academy.uz / Student123!. Supabase rejimida ushbu demo hisoblar ishlamaydi; haqiqiy Auth hisoblari kerak.

Saqlash modeli, test natijalari, cheklovlar va Vercelga joylash tartibi `README-SUPABASE.md`da.
