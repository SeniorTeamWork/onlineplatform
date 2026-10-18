import { supabase } from '../services/supabase';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { putFile, updateProfile } from '../services/db';
import Avatar from '../components/Avatar';
export default function Profile() {
  const {
    user,
    update,
    notify,
    cloud,
    command
  } = useApp();
  const [file, setFile] = useState(null),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    setBusy(true);
    try {
      const fields = {
        name: f.get('name'),
        email: f.get('email'),
        phone: f.get('phone'),
        password: f.get('password')
      };
      if (fields.password !== f.get('confirm')) throw Error('Yangi parollar bir xil emas.');
      if (file) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) throw Error('JPG, PNG yoki WebP rasm tanlang. Maksimal hajm: 3 MB.');
        fields.avatarId = await putFile(file);
      }
      let saved;
      if (cloud) {
        const auth = await supabase.auth.signInWithPassword({
          email: user.email,
          password: f.get('current')
        });
        if (auth.error) throw auth.error;
        if (fields.password || fields.email !== user.email) {
          const result = await supabase.auth.updateUser({
            ...(fields.password ? {
              password: fields.password
            } : {}),
            ...(fields.email !== user.email ? {
              email: fields.email
            } : {})
          });
          if (result.error) throw result.error;
        }
        await command('profile', {
          fields: {
            name: fields.name,
            phone: fields.phone,
            avatarId: fields.avatarId
          }
        });
        saved = true;
      } else saved = await update(d => updateProfile(d, user.id, fields, f.get('current')));
      if (saved) {
        form.elements.current.value = '';
        form.elements.password.value = '';
        form.elements.confirm.value = '';
        setFile(null);
        notify(cloud ? 'Profil saqlandi. Email o‘zgargan bo‘lsa, tasdiqlash xatini tekshiring.' : 'Profil yangilandi.');
      }
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <><div className="page-heading"><div><h1>Mening profilim</h1><p>Shaxsiy ma’lumotlar va hisob sozlamalari</p></div></div><section className="panel detail-panel profile-panel"><Avatar user={user} /><form onSubmit={save}><label>Profil rasmi<input key={file?.name || 'none'} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files[0] || null)} /></label><div className="form-grid"><label>Ism va familiya<input name="name" defaultValue={user.name} required minLength={3} /></label><label>Telefon raqami<input name="phone" type="tel" defaultValue={user.phone || ''} /></label><label>Login (email)<input name="email" type="email" defaultValue={user.email} required /></label><label>Joriy parol<input name="current" type="password" autoComplete="current-password" required /></label><label>Yangi parol (ixtiyoriy)<input name="password" type="password" autoComplete="new-password" minLength={8} /></label><label>Yangi parolni takrorlang<input name="confirm" type="password" autoComplete="new-password" minLength={8} /></label></div><button className="primary" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'O‘zgarishlarni saqlash'}</button></form></section></>;
}
