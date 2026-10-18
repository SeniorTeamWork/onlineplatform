import { useEffect, useState } from 'react';
import { getFile } from '../services/db';
export default function Avatar({
  user
}) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true,
      url;
    setSrc('');
    if (user?.avatarId) getFile(user.avatarId).then(blob => {
      if (alive && blob) {
        url = URL.createObjectURL(blob);
        setSrc(url);
      }
    }).catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [user?.avatarId]);
  return src ? <img className="profile-avatar" src={src} alt={user.name} /> : <div className="profile-avatar placeholder">{user?.name?.[0] || 'A'}</div>;
}
