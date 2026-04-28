import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname, search, hash } = location;

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate('/login', {
        replace: true,
        state: {
          from: { pathname, search, hash },
        },
      });
    }
  }, [hash, isAuthenticated, isInitialized, navigate, pathname, search]);

  if (!isInitialized || !isAuthenticated) {
    return null;
  }

  return <Outlet />;
}
