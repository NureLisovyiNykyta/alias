import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/Input.jsx";
import { Button } from "@/components/Button.jsx";
import { useRegisterMutation } from "@/api/auth.js";

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
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const { mutate, isPending } = useRegisterMutation({
    onSuccess: (data) => {
      onSuccess();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || "Registration failed. Please try again.";
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
          helpText={errors.password ? errors.password.message : "Enter a valid password"}
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
          helpText={errors.confirmPassword ? errors.confirmPassword.message : "Enter a valid password"}
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
          disabled={isPending}
          className="disabled:cursor-not-allowed"
        >
          {isPending ? "Signing Up" : "Sign Up"}
        </Button>
      </div>
    </form>
  );
};

export default PasswordStep;
