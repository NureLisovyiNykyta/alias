import { useState } from "react";
import AuthLayout from "@/components/AuthLayout.jsx";
import EmailStep from "@/components/sign-up/EmailStep.jsx";
import { Button } from "@/components/Button.jsx";

const SignUpFlow = () => {
  const [formData, setFormData] = useState({
    email: "",
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
  };

  const subtitles = {
    1: "This will be used to secure your account and future logins.",
    2: "Your unique identity on the platform. You can always change this later.",
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
        <div className="text-center p-10 flex flex-col items-center gap-10">
          <h2>Username Step Placeholder</h2>
          <p>Email is: {formData.email}</p>
          <div className="flex w-full justify-between">
            <Button
              variant='tertiary'
              onClick={handleBack}
            >
              Previous step
            </Button>
            <Button
              onClick={() => setCurrentStep(3)}
            >
              Next step
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default SignUpFlow;
