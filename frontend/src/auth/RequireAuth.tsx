import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppSelector } from '../store/hooks';

export default function RequireAuth() {
  const session = useAppSelector((state) => state.auth.session);
  const location = useLocation();
  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }
  return <Outlet />;
}
