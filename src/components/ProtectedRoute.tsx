/**
 * Protected Route Component
 *
 * This component wraps routes that require authentication.
 * If the user is not logged in, it redirects them to the login page.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, show the requested page
  return <>{children}</>;
}

export default ProtectedRoute;
