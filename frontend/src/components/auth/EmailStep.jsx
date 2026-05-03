import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Input from "@/components/Input.jsx";
import { Button } from "@/components/Button.jsx";
import { checkEmail } from "@/api/auth.js";

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

const EmailStep = ({
                     initialData = "",
                     onSuccess,
                     customSubmit = null,
                     isExternalPending = false,
                     buttonText = "Check"
                   }) => {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: initialData },
    mode: "onChange"
  });

  const currentEmail = useWatch({
    control,
    name: "email",
  });

  const defaultMutation = useMutation({
    mutationFn: (email) => checkEmail(email),
    onSuccess: (_, variables) => {
      onSuccess({ email: variables });
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || "This email is already in use or invalid.";
      setError("email", { type: "server", message: errorMessage });
    },
  });

  const onSubmit = (data) => {
    if (customSubmit) {
      customSubmit(data.email, setError);
    } else {
      defaultMutation.mutate(data.email);
    }
  };

  const isEmailValid = !!currentEmail && currentEmail.length > 0 && !errors.email;
  const isPending = customSubmit ? isExternalPending : defaultMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full flex flex-col gap-10 items-center"
    >
      <div className="w-full border border-black rounded-[8px] py-10 px-21 flex flex-col gap-6 bg-white">
        <Input
          id="email"
          label="Email"
          placeholder="alias@gmail.com"
          showArrow={false}
          {...register("email")}
          error={!!errors.email}
          isValid={isEmailValid}
          helpText={errors.email ? errors.email.message : "Enter a valid email address"}
          successText="Correct format"
          wide={true}
        />
      </div>

      <div className="w-full flex justify-end">
        <Button
          type="submit"
          disabled={isPending || !isEmailValid}
        >
          {isPending ? "Processing" : buttonText}
        </Button>
      </div>
    </form>
  );
};

export default EmailStep;
