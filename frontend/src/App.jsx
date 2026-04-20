import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Landing from "@/pages/Landing.jsx";
import Header from "@/components/Header.jsx";
import Navigation from "@/components/Navigation.jsx";

const Login = () => <div>Login Page</div>;
const Dashboard = () => <div>Dashboard (Protected)</div>;

function App() {
  const isAuthenticated = false;

  return (
    <BrowserRouter>
      <Header />

      <div className="flex">
        <Navigation />

        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />

            <Route element={<ProtectedRoute isAllowed={!isAuthenticated} redirectTo="/dashboard" />}>
              <Route path="/login" element={<Login />} />
            </Route>

            <Route element={<ProtectedRoute isAllowed={isAuthenticated} redirectTo="/login" />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
