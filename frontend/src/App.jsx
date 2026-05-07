import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layouts/ProtectedRoute.jsx';
import MainLayout from '@/components/layouts/MainLayout.jsx';
import Landing from "@/pages/Landing.jsx";
import Profile from "@/pages/Profile.jsx";
import PacksGallery from "@/pages/PacksGallery.jsx";
import TopScroller from "@/utils/topScroller.js";
import SignIn from "@/pages/SignIn.jsx";
import SignUp from "@/pages/SignUp.jsx";
import { useAuth } from '@/contexts/AuthContext.jsx';
import GoogleSignUp from "@/pages/GoogleSignUp.jsx";
import ForgotPassword from "@/pages/ForgotPassword.jsx";
import CardPackCreator from "@/pages/CardPackCreator.jsx";
import MapCreator from "@/pages/MapCreator.jsx";
import CardPackEditor from "@/pages/CardPackEditor.jsx";
import MapEditor from "@/pages/MapEditor.jsx";
import WordsEditor from "@/pages/WordsEditor.jsx";
import MapFieldsEditor from "@/pages/MapFieldsEditor.jsx";

function App() {
  const { isAuthenticated, user } = useAuth();

  const isFullyVerified = isAuthenticated && user?.is_email_verified;

  const canAccessAuth = !isAuthenticated || (isAuthenticated && !user?.is_email_verified);

  return (
    <BrowserRouter>
      <TopScroller/>
      <Routes>
        <Route element={<MainLayout/>}>
          <Route path="/" element={<Landing/>}/>

          <Route path="/profile" element={<Profile/>}/>
          <Route path='/gallery'>
            <Route path="packs" element={<PacksGallery/>}/>
          </Route>

          <Route path="/new" element={<ProtectedRoute isAllowed={true} redirectTo="/auth/sign-in"/>}>
            <Route path="card-pack" element={<CardPackCreator/>}/>
            <Route path="map" element={<MapCreator/>}/>
          </Route>

          <Route path="/edit" element={<ProtectedRoute isAllowed={true} redirectTo="/auth/sign-in"/>}>
            <Route path='card-pack/:id' element={<CardPackEditor/>}/>
            <Route path='card-pack/:id/words' element={<WordsEditor/>}/>
            <Route path="map/:id" element={<MapEditor/>}/>
            <Route path="map/:id/fields" element={<MapFieldsEditor/>}/>
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
