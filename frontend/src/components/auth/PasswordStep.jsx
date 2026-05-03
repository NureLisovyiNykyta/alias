import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/Input.jsx";
import { Button } from "@/components/Button.jsx";
import { useRegisterMutation } from "@/api/auth.js";
import { useAuth } from "@/contexts/AuthContext.jsx";

const passwordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const PasswordStep = ({ email, username, onSuccess, onBack }) => {
  const { setTokens } = useAuth();

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, dirtyFields },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    mode: "onChange"
  });

  const [currentPassword, currentConfirm] = useWatch({
    control,
    name: ["password", "confirmPassword"],
  });

  const { mutate, isPending } = useRegisterMutation({
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      onSuccess();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || "Registration failed. Please try again.";
      setError("password", { type: "server", message: errorMessage });
      setError("confirmPassword", { type: "server", message: errorMessage });
    },
  });

  const onSubmit = (data) => {
    mutate({
      email,
      username,
      password: data.password,
    });
  };

  const isPasswordValid = !!currentPassword && currentPassword.length > 0 && !errors.password;
  const isConfirmPasswordValid = !!currentConfirm && currentConfirm.length > 0 && !errors.confirmPassword;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full flex flex-col gap-10 items-center"
    >
      <div className="w-full border border-text-label rounded-[8px] py-10 px-21 flex flex-col gap-6 bg-white">
        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          showArrow={false}
          {...register("password")}
          error={!!errors.password}
          isValid={isPasswordValid}
          helpText={errors.password ? errors.password.message : "Enter a valid password"}
          successText="Correct format"
          wide={true}
        />

        <Input
          id="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="Enter your password"
          showArrow={false}
          {...register("confirmPassword")}
          error={!!errors.confirmPassword}
          isValid={isConfirmPasswordValid}
          helpText={errors.confirmPassword ? errors.confirmPassword.message : "Confirm your password"}
          successText="Passwords match"
          wide={true}
        />
      </div>

      <div className="w-full flex justify-between">
        <Button
          type="button"
          onClick={onBack}
          variant='tertiary'
        >
          Previous step
        </Button>

        <Button
          type="submit"
          disabled={isPending || !isPasswordValid || !isConfirmPasswordValid}
        >
          {isPending ? "Signing Up" : "Sign Up"}
        </Button>
      </div>
    </form>
  );
};

export default PasswordStep;
