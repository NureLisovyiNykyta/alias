import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Input from "@/components/Input.jsx";
import { Button } from "@/components/Button.jsx";
import { checkEmail } from "@/api/auth.js";

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

const EmailStep = ({ initialData = "", onSuccess }) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: initialData },
  });

  const mutation = useMutation({
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
    mutation.mutate(data.email);
  };

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
          helpText={errors.email ? errors.email.message : "Enter a valid email address"}
          wide={true}
        />
      </div>

      <div className="w-full flex justify-end">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="disabled:cursor-not-allowed"
        >
          {mutation.isPending ? "Checking" : "Next step"}
        </Button>
      </div>
    </form>
  );
};

export default EmailStep;
