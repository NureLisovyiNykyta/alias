import ModalLayout from "@/components/modals/ModalLayout.jsx";
import { Button } from "@/components/buttons/Button.jsx";

export default function GameConfirmModal ({
                            isOpen,
                            onClose,
                            title = 'Are you sure?',
                            label = 'This action cannot be undone',
                            paragraph = null,
                            onSuccess
                          }) {
  return (
    <ModalLayout isOpen={isOpen} onClose={onClose}>
      <div className="w-[594px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col p-9 gap-11 rounded-[12px] bg-white">
        <div className="w-full gap-4 flex flex-col">
          <h1 className="text-h1">
            {title}
          </h1>
          <h2 className="text-h2">
            {label}
          </h2>
          {paragraph && (
            <h2 className="text-h2">
              {paragraph}
            </h2>
          )}
        </div>

        <div className="flex items-center w-full justify-between">
          <Button variant="tertiary" onClick={onClose}>
            No
          </Button>

          <Button onClick={onSuccess}>
            Yes
          </Button>
        </div>

      </div>
    </ModalLayout>
  );
};
