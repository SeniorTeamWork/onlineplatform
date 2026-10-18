# Supabase backend v6

Asosiy papkadagi `README-SUPABASE.md`ni o‘qing.

1. `schema.sql` → Supabase SQL Editor.
2. Authda admin → `BOOTSTRAP-ADMIN.sql`da emailni almashtirib bajarish.
3. `npx supabase functions deploy academy --project-ref YOUR_PROJECT_REF --no-verify-jwt`.
4. Asosiy `.env`ga URL/publishable key va DATA_MODE=supabase.

`migrations/202610180001_academy.sql` va `schema.sql` bir xil. Eski v5.1 jadvallari o‘chirilmaydi, yangi backend academy_state/academy_audit jadvallaridan foydalanadi. Eski ma’lumotlar avtomatik import qilinmaydi.
