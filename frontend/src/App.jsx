import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout.jsx';
import Landing from "@/pages/Landing.jsx";
import Profile from "@/pages/Profile.jsx";

const Login = () => <div>Login Page</div>;
const Dashboard = () => <div>Dashboard (Protected)</div>;

function App() {
  const isAuthenticated = false;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Landing />} />

          <Route element={<ProtectedRoute isAllowed={!isAuthenticated} redirectTo="/dashboard" />}>
            <Route path="/login" element={<Login />} />
          </Route>

          <Route path="/profile" element={<Profile />} />

          <Route element={<ProtectedRoute isAllowed={isAuthenticated} redirectTo="/login" />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
