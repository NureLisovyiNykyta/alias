import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout.jsx';
import Landing from "@/pages/Landing.jsx";
import Profile from "@/pages/Profile.jsx";
import PacksGallery from "@/pages/PacksGallery.jsx";
import ScrollToTop from "@/components/ScrollToTop.jsx";
import PacksList from "@/pages/PacksList.jsx";
import SignIn from "@/pages/SignIn.jsx";
import SignUp from "@/pages/SignUp.jsx";
import { useAuth } from '@/contexts/AuthContext.jsx';
import GoogleSignUp from "@/pages/GoogleSignUp.jsx";
import ForgotPassword from "@/pages/ForgotPassword.jsx";
import TaskCreator from "@/pages/TaskCreator.jsx";
import FormExample from "@/pages/FormExample.jsx";

function App() {
  const { isAuthenticated, user } = useAuth();

  const isFullyVerified = isAuthenticated && user?.is_email_verified;

  const canAccessAuth = !isAuthenticated || (isAuthenticated && !user?.is_email_verified);

  return (
    <BrowserRouter>
      <ScrollToTop/>
      <Routes>
        <Route element={<MainLayout/>}>
          <Route path="/" element={<Landing/>}/>

          <Route path="/profile" element={<Profile/>}/>
          <Route path="/gallery" element={<PacksGallery/>}/>
          <Route path="/packs/:type" element={<PacksList/>}/>

          <Route path="/new" element={<ProtectedRoute isAllowed={true} redirectTo="/auth/sign-in"/>}>
            <Route path="card-pack" element={<FormExample/>}/>
          </Route>
        </Route>

        <Route path='/auth' element={<ProtectedRoute isAllowed={canAccessAuth} redirectTo="/"/>}>
          <Route path="sign-in" element={<SignIn/>}/>
          <Route path="sign-up" element={<SignUp/>}/>
          <Route path="google-sign-up" element={<GoogleSignUp/>}/>
          <Route path="forgot-password" element={<ForgotPassword/>}/>
        </Route>

        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
