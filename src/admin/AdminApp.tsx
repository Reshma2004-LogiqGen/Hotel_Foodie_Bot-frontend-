import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ToastProvider } from './components/Toast';
import AdminLayout from './components/AdminLayout';
import AuthGate from './components/AuthGate';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import KitchenPage from './pages/KitchenPage';
import MenuPage from './pages/MenuPage';
import TablesPage from './pages/TablesPage';
import TeamPage from './pages/TeamPage';
import '../styles/theme.css';
import './admin.css';

export default function AdminApp() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route element={<AuthGate roles={['admin', 'chef']}><AdminLayout /></AuthGate>}>
            <Route path="kitchen" element={<KitchenPage />} />
            <Route path="menu" element={<AuthGate roles={['admin']}><MenuPage /></AuthGate>} />
            <Route path="tables" element={<AuthGate roles={['admin']}><TablesPage /></AuthGate>} />
            <Route path="team" element={<AuthGate roles={['admin']}><TeamPage /></AuthGate>} />
          </Route>
          <Route path="staff" element={<Navigate to="/admin/team" replace />} />
          <Route path="*" element={<Navigate to="/admin/menu" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
