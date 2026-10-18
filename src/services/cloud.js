import { supabase } from './supabase';
export const cloudEnabled = process.env.REACT_APP_DATA_MODE !== 'demo';
export async function api(action, payload = {}) {
  if (!supabase) throw Error('Supabase URL va publishable key .env faylida kiritilmagan.');
  const {
    data,
    error
  } = await supabase.functions.invoke('academy', {
    body: {
      action,
      ...payload
    }
  });
  if (error) {
    let message = error.message;
    try {
      message = (await error.context.json()).error || message;
    } catch {}
    throw Error(message);
  }
  if (data?.error) throw Error(data.error);
  return data;
}
export async function uploadCloudFile(file) {
  const mime=file.type || ({pdf:'application/pdf',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp4:'video/mp4',webm:'video/webm'}[file.name.split('.').pop().toLowerCase()] || 'application/octet-stream');
  const {
    path,
    token,
    bucket
  } = await api('upload', {
    name: file.name,
    type: mime,
    size: file.size
  });
  const {
    error
  } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {
    contentType: mime,
    upsert: false
  });
  if (error) throw error;
  return path;
}
export async function mediaUrl(path) {
  const result = await api('media', {
    path
  });
  return result.url;
}
export async function cloudFile(path) {
  const response = await fetch(await mediaUrl(path));
  if (!response.ok) throw Error('Fayl yuklanmadi.');
  return response.blob();
}
