import { createClient } from 'npm:@supabase/supabase-js@2';
import { view, applyUpdate, mayReadFile } from '../_shared/logic.js';
import * as D from '../_shared/domain.js';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json'
};
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers
});
function must(value: unknown, message = 'Ruxsat berilmagan.') {
  if (!value) throw Error(message);
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers
  });
  if (req.method !== 'POST') return response({
    error: 'POST required'
  }, 405);
  let createdId: string | undefined;
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '');
    must(token, 'Hisobga kiring.');
    const {
      data: auth,
      error: authError
    } = await db.auth.getUser(token);
    must(!authError && auth.user, 'Sessiya tugagan. Qayta kiring.');
    const body = await req.json();
    const {
      data: row,
      error: loadError
    } = await db.from('academy_state').select('*').eq('id', 1).single();
    if (loadError) throw loadError;
    const state = row.data;
    state.expenses ??= [];
    const user = state.users.find((u: any) => u.id === auth.user!.id);
    must(user?.active, 'Hisob faol emas yoki admin tomonidan biriktirilmagan.');
    const admin = user.role === 'admin';
    // Keep email in sync after Auth confirms an email change; never return Auth passwords.
    const emailChanged = user.email !== auth.user!.email;
    if (emailChanged) user.email = auth.user!.email;
    if (body.action === 'read') {
      let revision = row.revision;
      if (emailChanged) {
        const saved = await db.rpc('academy_commit', {
          expected: row.revision,
          document: state,
          actor: user.id,
          operation: 'sync-email'
        });
        if (saved.error) throw saved.error;
        revision = saved.data;
      }
      return response({
        data: view(state, user),
        revision
      });
    }
    if (body.action === 'upload') {
      const video = String(body.type).startsWith('video/');
      must(admin || !video, 'Video faqat admin tomonidan yuklanadi.');
      must(Number.isInteger(body.size) && body.size > 0 && body.size <= (video ? 200 : 20) * 1024 * 1024, 'Fayl hajmi noto‘g‘ri.');
      const ext = String(body.name).split('.').pop()?.toLowerCase();
      must(['mp4', 'webm', 'pdf', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp'].includes(ext || ''));
      const path = user.id + '/uploads/' + crypto.randomUUID() + '.' + ext;
      const bucket = admin ? 'academy-media' : 'academy-student-media';
      const {
        data,
        error
      } = await db.storage.from(bucket).createSignedUploadUrl(path);
      if (error) throw error;
      return response({
        path,
        token: data.token,
        bucket
      });
    }
    if (body.action === 'media') {
      must(typeof body.path === 'string' && mayReadFile(state, user, body.path));
      const owner = state.users.find((u: any) => u.id === body.path.split('/')[0]);
      const bucket = owner?.role === 'admin' ? 'academy-media' : 'academy-student-media';
      const {
        data,
        error
      } = await db.storage.from(bucket).createSignedUrl(body.path, 3600);
      if (error) throw error;
      return response({
        url: data.signedUrl
      });
    }
    if (body.action === 'setPassword') {
      must(admin);
      const target = state.users.find((u: any) => u.id === body.userId && u.role === 'student');
      must(target);
      must(typeof body.password === 'string' && body.password.length >= 8);
      const {
        error
      } = await db.auth.admin.updateUserById(target.id, {
        password: body.password
      });
      if (error) throw error;
      return response({
        ok: true
      });
    }
    must(body.revision === row.revision, 'Ma’lumot yangilangan. Sahifani yangilab, qayta saqlang.');
    let result: any;
    if (body.action === 'update') {
      // Student attachments must belong to their upload namespace.
      if (!admin) for (const s of body.next.submissions || []) if (!state.submissions.some((x: any) => x.id === s.id) && s.attachment) must(s.attachment.fileId.startsWith(user.id + '/uploads/'));
      applyUpdate(state, user, body.next);
    } else if (body.action === 'student') {
      must(admin);
      const {
        draft,
        selected,
        settings
      } = body;
      const existing = state.users.find((u: any) => u.id === draft.id);
      must(!existing || existing.role === 'student');
      must(!existing || draft.email === existing.email, 'Mavjud loginni o‘quvchi profilidan o‘zgartiring.');
      const clean = {
        id: draft.id,
        name: draft.name,
        email: draft.email,
        phone: draft.phone || '',
        notes: draft.notes || '',
        active: draft.active === true,
        accessMode: draft.accessMode === 'deposit' ? 'deposit' : 'active',
        role: 'student',
        password: existing ? 'temporary-validation-only' : draft.password,
        createdAt: existing?.createdAt || new Date().toISOString()
      };
      // Validate entire proposed transaction before creating the Auth account.
      D.saveStudentWithPayment(structuredClone(state), clean, selected, settings || {}, user.id);
      if (!existing) {
        const {
          data,
          error
        } = await db.auth.admin.createUser({
          email: draft.email,
          password: draft.password,
          email_confirm: true
        });
        if (error) throw error;
        createdId = data.user.id;
        clean.id = createdId;
      }
      D.saveStudentWithPayment(state, clean, selected, settings || {}, user.id);
      state.users.forEach((u: any) => delete u.password);
      result = {
        studentId: clean.id
      };
    } else if (body.action === 'profile') {
      const f = body.fields;
      must(f.name?.trim().length >= 3);
      must(!f.phone || /^\+?[0-9 ()-]{7,20}$/.test(f.phone));
      if (f.avatarId) must(f.avatarId.startsWith(user.id + '/uploads/'));
      Object.assign(user, {
        name: f.name.trim(),
        phone: f.phone?.trim() || '',
        ...(f.avatarId ? {
          avatarId: f.avatarId
        } : {})
      });
    } else if (body.action === 'certificate') {
      result = {
        certificate: D.issueCertificate(state, user.id, body.courseId)
      };
    } else throw Error('Noma’lum amal.');
    const {
      data: revision,
      error
    } = await db.rpc('academy_commit', {
      expected: row.revision,
      document: state,
      actor: user.id,
      operation: body.action
    });
    if (error) throw error;
    createdId = undefined;
    return response({
      data: view(state, user),
      revision,
      ...result
    });
  } catch (e) {
    if (createdId) await db.auth.admin.deleteUser(createdId);
    return response({
      error: e instanceof Error ? e.message : 'Server xatosi'
    }, 400);
  }
});
