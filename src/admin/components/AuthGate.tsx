import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { CircleAlert } from 'lucide-react';
import { homePath, useAuth } from '../auth';
import type { StaffRole } from '../types';
import { Spinner } from './ui';

export default function AuthGate({ roles, children }: { roles: StaffRole[]; children: ReactNode }) {
  const { status, user, retry } = useAuth();

  if (status === 'checking') {
    return (
      <div className="adm adm-fullscreen">
        <Spinner size={28} />
      </div>
    );
  }
  if (status === 'offline') {
    return (
      <div className="adm adm-fullscreen">
        <div className="adm-offline">
          <CircleAlert size={28} />
          <h2>Can't reach the server</h2>
          <p>Check that the backend is running, then try again.</p>
          <button className="adm-btn adm-btn--primary" onClick={retry}>Try again</button>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePath(user)} replace />;
  return <>{children}</>;
}
