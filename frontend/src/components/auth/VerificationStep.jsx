import { useForm, Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import VerificationCodeInput from "@/components/VerificationCodeInput.jsx";
import { Button } from "@/components/Button.jsx";
import { useVerifyEmailMutation } from "@/api/auth.js";

const verificationSchema = z.object({
  code: z.string().length(6, "Code must be exactly 6 digits"),
});

const VerificationStep = ({
                            onSuccess,
                            onBack,
                            customSubmit = null,
                            isExternalPending = false,
                            externalError = null
                          }) => {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(verificationSchema),
    defaultValues: { code: "" },
    mode: "onChange",
  });

  const defaultMutation = useVerifyEmailMutation({
    onSuccess: () => onSuccess(),
    onError: (error) => {
      const errorMessage = error.response?.data?.message || "Invalid verification code.";
      setError("code", { type: "server", message: errorMessage });
    },
  });

  const onSubmit = (data) => {
    if (customSubmit) {
      customSubmit(data.code, setError);
    } else {
      defaultMutation.mutate({ code: data.code });
    }
  };

  const currentCode = useWatch({ control, name: "code" });
  const isCodeValid = currentCode?.length === 6 && !errors.code && !externalError;

  const isPending = customSubmit ? isExternalPending : defaultMutation.isPending;

  const displayError = errors.code?.message || externalError;
  let messageToDisplay = displayError ? displayError : "Enter correct code";
  let messageColorClass = displayError ? 'text-red-500' : isCodeValid ? 'text-decorative-700' : 'text-text-label';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full flex flex-col gap-10 items-center"
    >
      <div className="w-full border border-text-label rounded-[8px] py-10 px-21 flex flex-col gap-6 bg-white items-center">
        <div className="flex flex-col gap-2 w-fit">
          <label className="font-noto text-p">Verification code</label>

          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <VerificationCodeInput
                {...field}
                error={!!displayError}
                isValid={isCodeValid}
              />
            )}
          />

          <span className={`text-label font-noto ${messageColorClass}`}>
            {messageToDisplay}
          </span>
        </div>
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
          disabled={isPending || !isCodeValid}
        >
          {isPending ? "Verifying" : "Verify"}
        </Button>
      </div>
    </form>
  );
};

export default VerificationStep;
