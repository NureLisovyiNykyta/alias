import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/inputs/Input.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import { useCheckUsernameMutation, useRegisterMutation } from "@/api/auth.js";

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
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: initialData },
    mode: "onChange"
  });

  const currentUsername = useWatch({
    control,
    name: "username",
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

  const isUsernameValid = !!currentUsername && currentUsername.length > 0 && !errors.username;

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
          isValid={isUsernameValid}
          helpText={errors.username ? errors.username.message : "Enter a valid username"}
          successText="Correct format"
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
          disabled={isPending || !isUsernameValid}
        >
          {isPending ? "Checking" : "Check"}
        </Button>
      </div>
    </form>
  );
};

export default UsernameStep;
