import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/Input.jsx";
import { Button } from "@/components/Button.jsx";
import { useCheckUsernameMutation } from "@/api/auth.js";

const usernameSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters long")
    .max(20, "Username must be at most 20 characters long")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores are allowed"),
});

const UsernameStep = ({ initialData = "", onSuccess, onBack }) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: initialData },
  });

  const { mutate, isPending } = useCheckUsernameMutation({
    onSuccess: (_, variables) => {
      onSuccess({ username: variables });
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || "This username is already taken or invalid.";
      setError("username", { type: "server", message: errorMessage });
    },
  });

  const onSubmit = (data) => {
    mutate(data.username);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full flex flex-col gap-10 items-center"
    >
      <div className="w-full border border-text-label rounded-[8px] py-10 px-21 flex flex-col gap-6 bg-white">
        <Input
          id="username"
          label="Username"
          placeholder="alias1836"
          showArrow={false}
          {...register("username")}
          error={!!errors.username}
          helpText={errors.username ? errors.username.message : "Enter a valid username"}
          wide={true}
        />
      </div>

      <div className="w-full flex justify-between">
        <Button
          type="button"
          onClick={onBack}
          variant="tertiary"
        >
          Previous step
        </Button>

        <Button
          type="submit"
          disabled={isPending}
          className="disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Checking" : "Next step"}
        </Button>
      </div>
    </form>
  );
};

export default UsernameStep;
