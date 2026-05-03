import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/Input.jsx";
import { Button } from "@/components/Button.jsx";

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const ResetPasswordStep = ({ onSuccess, onBack }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange"
  });

  const [currentPassword, currentConfirm] = useWatch({
    control,
    name: ["password", "confirmPassword"],
  });

  const onSubmit = (data) => {
    onSuccess({ new_password: data.password });
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
          label="New password"
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
          disabled={!isPasswordValid || !isConfirmPasswordValid}
        >
          Next step
        </Button>
      </div>
    </form>
  );
};

export default ResetPasswordStep;
