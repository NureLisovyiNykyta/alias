import { useState } from "react";
import AuthLayout from "@/components/AuthLayout.jsx";
import EmailStep from "@/components/auth/EmailStep.jsx";
import UsernameStep from "@/components/auth/UsernameStep.jsx";
import PasswordStep from "@/components/auth/PasswordStep.jsx";
import VerificationStep from "@/components/auth/VerificationStep.jsx";

const SignUp = () => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
  });
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const breadcrumbs = [
    { id: 1, path: "/", label: "Main menu" },
    { id: 2, label: "Sign Up" },
  ];

  const titles = {
    1: 'Enter your email',
    2: "Choose a username",
    3: "Create a password",
    4: "Verify your email",
  };

  const subtitles = {
    1: "This will be used to secure your account and future logins.",
    2: "Your unique identity on the platform. You can always change this later.",
    3: "Make sure it's strong and secure to keep your account safe.",
    4: "We've sent a 6-digit code to your inbox. Enter it below to continue.",
  };

  const handleStepSuccess = (stepData) => {
    setFormData((prev) => ({ ...prev, ...stepData }));
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  return (
    <AuthLayout
      breadcrumbs={breadcrumbs}
      title={titles[currentStep]}
      subtitle={subtitles[currentStep]}
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      {currentStep === 1 && (
        <EmailStep
          initialData={formData.email}
          onSuccess={handleStepSuccess}
          onBack={currentStep > 1 ? handleBack : null}
        />
      )}

      {currentStep === 2 && (
        <UsernameStep
          initialData={formData.username || formData.email.split('@')[0]}
          onSuccess={handleStepSuccess}
          onBack={handleBack}
        />
      )}

      {currentStep === 3 && (
        <PasswordStep
          email={formData.email}
          username={formData.username}
          onSuccess={handleStepSuccess}
          onBack={handleBack}
        />
      )}

      {currentStep === 4 && (
        <VerificationStep
          onSuccess={handleStepSuccess}
          onBack={handleBack}
        />
      )}
    </AuthLayout>
  );
};

export default SignUp;
