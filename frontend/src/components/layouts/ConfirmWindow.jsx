import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button } from "@/components/buttons/Button.jsx";

const ConfirmWindow = ({
                         isOpen,
                         onClose,
                         title = 'Are you sure',
                         label = 'This action cannot be undone',
                         paragraph = null,
                         onSuccess
                       }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden="true"/>
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel
              className="w-[594px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col p-9 gap-11 rounded-[12px] bg-white">
              <div className="w-full gap-4 flex flex-col">
                <Dialog.Title as="h1" className="text-h1">
                  {title}
                </Dialog.Title>
                <Dialog.Description as="h2" className="text-h2">
                  {label}
                </Dialog.Description>
                {paragraph && (
                  <Dialog.Description as="h2" className="text-h2">
                    {paragraph}
                  </Dialog.Description>
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
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmWindow;
