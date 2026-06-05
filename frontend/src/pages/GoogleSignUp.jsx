import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "@/components/layouts/AuthLayout.jsx";
import UsernameStep from "@/components/auth/UsernameStep.jsx";
import GooglePasswordStep from "@/components/auth/GooglePasswordStep.jsx";
import AvatarStep from "@/components/auth/AvatarStep.jsx";

const GoogleSignUp = () => {
  const navigate = useNavigate();

  const googleToken = sessionStorage.getItem('temp_google_token');

  const [formData, setFormData] = useState({
    username: "",
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  useEffect(() => {
    if (!googleToken) {
      navigate('/auth/sign-in');
    }
  }, [googleToken, navigate]);

  const breadcrumbs = [
    { id: 1, path: "/", label: "Main menu" },
    { id: 2, label: "Google Sign Up" },
  ];

  const titles = { 1: "Choose a username", 2: "Create a password", 3: "Personalize your profile" };
  const subtitles = {
    1: "Your unique identity on the platform. You can always change this later.",
    2: "Make sure it's strong and secure to keep your account safe.",
    3: "Add a nickname and an avatar so others can recognize you. You can skip this for now.",
  };

  const handleStepSuccess = (stepData) => {
    if (stepData) setFormData((prev) => ({ ...prev, ...stepData }));
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => setCurrentStep((prev) => prev - 1);

  if (!googleToken) return null;

  return (
    <AuthLayout
      breadcrumbs={breadcrumbs}
      title={titles[currentStep]}
      subtitle={subtitles[currentStep]}
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      {currentStep === 1 && (
        <UsernameStep
          initialData={formData.username}
          onSuccess={handleStepSuccess}
          onBack={null}
        />
      )}

      {currentStep === 2 && (
        <GooglePasswordStep
          googleToken={googleToken}
          username={formData.username}
          onSuccess={handleStepSuccess}
        />
      )}

      {currentStep === 3 && (
        <AvatarStep
          onSuccess={() => {
            sessionStorage.removeItem('temp_google_token');
            navigate('/');
          }}
          onBack={handleBack}
        />
      )}
    </AuthLayout>
  );
};

export default GoogleSignUp;
