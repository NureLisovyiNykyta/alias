import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "@/components/layouts/AuthLayout.jsx";
import EmailStep from "@/components/auth/EmailStep.jsx";
import ResetPasswordStep from "@/components/auth/ResetPasswordStep.jsx";
import VerificationStep from "@/components/auth/VerificationStep.jsx";
import { useForgotPasswordMutation, useResetPasswordMutation } from "@/api/auth.js";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    new_password: "",
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const forgotPasswordMutation = useForgotPasswordMutation({
    onSuccess: (_, variables) => {
      setFormData(prev => ({ ...prev, email: variables }));
      setCurrentStep(2);
    },
  });

  const resetPasswordMutation = useResetPasswordMutation({
    onSuccess: () => {
      navigate('/auth/sign-in');
    },
  });

  const breadcrumbs = [
    { id: 1, path: "/", label: "Main menu" },
    { id: 2, path: "/auth/sign-in", label: "Login" },
    { id: 3, label: "Reset Password" },
  ];

  const titles = {
    1: 'Forgot password?',
    2: "Create a password",
    3: "Verify your attempt",
  };

  const subtitles = {
    1: "Enter your email address below and we'll send you a 6-digit code to reset your password.",
    2: "Make sure it's strong and secure to keep your account safe.",
    3: "We've sent a 6-digit code to your inbox. Enter it below to confirm password change.",
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
          buttonText="Next step"
          isExternalPending={forgotPasswordMutation.isPending}
          customSubmit={(email, setError) => {
            forgotPasswordMutation.mutate(email, {
              onError: (error) => {
                setError("email", {
                  type: "server",
                  message: error.response?.data?.message || "User with this email not found."
                });
              }
            });
          }}
        />
      )}

      {currentStep === 2 && (
        <ResetPasswordStep
          onSuccess={handleStepSuccess}
          onBack={handleBack}
        />
      )}

      {currentStep === 3 && (
        <VerificationStep
          onBack={handleBack}
          isExternalPending={resetPasswordMutation.isPending}
          customSubmit={(code, setError) => {
            resetPasswordMutation.mutate({
              email: formData.email,
              new_password: formData.new_password,
              code: code
            }, {
              onError: (error) => {
                setError("code", {
                  type: "server",
                  message: error.response?.data?.message || "Invalid or expired code."
                });
              }
            });
          }}
        />
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
