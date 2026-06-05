import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute = ({ isAllowed, isLoading = false, redirectTo = "/" }) => {
  if (!isAllowed && !isLoading) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};