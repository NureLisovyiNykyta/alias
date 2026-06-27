import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layouts/ProtectedRoute.jsx';
import MainLayout from '@/components/layouts/MainLayout.jsx';
import Landing from "@/pages/Landing.jsx";
import MyProfile from "@/pages/MyProfile.jsx";
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
import PublicProfile from "@/pages/PublicProfile.jsx";
import MapPreview from "@/pages/MapPreview.jsx";
import CardPackPreview from "@/pages/CardPackPreview.jsx";
import MapsGallery from "@/pages/MapsGallery.jsx";
import LobbyCreator from "@/pages/LobbyCreator.jsx";
import LobbyLayout from "@/components/layouts/LobbyLayout.jsx";
import WaitingRoom from "@/pages/WaitingRoom.jsx";
import JoinRoom from "@/pages/JoinRoom.jsx";
import ActiveLobbyWidget from "@/components/layouts/ActiveLobbyWidget.jsx";
import Gameplay from "@/pages/Gameplay.jsx";

export default function App() {
  const { isAuthenticated, user, isLoading } = useAuth();

  const isFullyVerified = isAuthenticated && user?.is_email_verified;

  const isGoogleSignUpFlow = !!sessionStorage.getItem('temp_google_token');
  const canAccessAuth = !isAuthenticated || (isAuthenticated && !user?.is_email_verified) || isGoogleSignUpFlow;

  return (
    <BrowserRouter>
      <ActiveLobbyWidget/>
      <TopScroller/>
      <Routes>
        <Route element={<MainLayout/>}>
          <Route path="/" element={<Landing/>}/>

          <Route path="/me" element={<MyProfile/>}/>
          <Route path='/gallery'>
            <Route path="packs" element={<PacksGallery/>}/>
            <Route path="maps" element={<MapsGallery/>}/>
          </Route>

          <Route path='user/:username' element={<PublicProfile/>}/>
          <Route path='map/:id' element={<MapPreview/>}/>
          <Route path='card-pack/:id' element={<CardPackPreview/>}/>

          <Route element={<ProtectedRoute isAllowed={isFullyVerified} isLoading={isLoading} redirectTo="/auth/sign-in"/>}>
            <Route path="/new">
              <Route path="card-pack" element={<CardPackCreator/>}/>
              <Route path="map" element={<MapCreator/>}/>
              <Route path="lobby" element={<LobbyCreator/>}/>
            </Route>

            <Route path="/edit">
              <Route path='card-pack/:id' element={<CardPackEditor/>}/>
              <Route path='card-pack/:id/words' element={<WordsEditor/>}/>
              <Route path="map/:id" element={<MapEditor/>}/>
              <Route path="map/:id/fields" element={<MapFieldsEditor/>}/>
            </Route>
          </Route>
        </Route>

        <Route path='/lobby/:code'>
          <Route element={<LobbyLayout/>}>
            <Route path='waiting' element={<WaitingRoom/>}/>
          </Route>

          <Route path='game' element={<Gameplay/>}/>
          <Route path='join' element={<JoinRoom/>}/>
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
