import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { sessionEnded } from './authSlice';

export default function SessionLifecycle() {
  const session = useAppSelector((state) => state.auth.session);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!session) return;
    let timer: ReturnType<typeof setTimeout>;
    const checkExpiry = () => {
      clearTimeout(timer);
      const remaining = Date.parse(session.expiresAt) - Date.now();
      if (remaining <= 0) dispatch(sessionEnded('expired'));
      else timer = setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647));
    };
    checkExpiry();
    window.addEventListener('focus', checkExpiry);
    document.addEventListener('visibilitychange', checkExpiry);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', checkExpiry);
      document.removeEventListener('visibilitychange', checkExpiry);
    };
  }, [session, dispatch]);

  return null;
}
