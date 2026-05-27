import React from 'react';
import { Listbox } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import dropDownArrow from '@/assets/dropDownArrow.svg';

const   DropDown = ({
                    label,
                    placeholder = 'Choose the card pack type',
                    options = [],
                    value,
                    onChange,
                    width = 'w-[260px]',
                    error,
                    isValid = false,
                  }) => {
  let borderColorClass = 'border-text-label';
  if (error) {
    borderColorClass = 'border-red-500';
  } else if (isValid) {
    borderColorClass = 'border-decorative-700';
  }

  return (
    <div className={`flex flex-col gap-2 ${width}`}>
      {label && <span className="font-noto text-p">{label}</span>}

      <Listbox value={value} onChange={onChange}>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button
              className={`flex bg-surface items-center border ${borderColorClass} rounded-[8px] py-[10px] px-4 justify-between w-full h-[48px] transition-colors outline-none cursor-pointer`}
            >
              <span
                className={`text-label font-noto truncate ${
                  value ? 'text-text' : 'text-text-label'
                }`}
              >
                {value ? value.label : placeholder}
              </span>

              <div
                className="flex items-center justify-center w-6 h-6 rounded-[8px] bg-brand-500 shrink-0"
                style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <img src={dropDownArrow} alt="Dropdown Arrow" />
              </div>
            </Listbox.Button>

            <AnimatePresence>
              {open && (
                <Listbox.Options
                  static
                  as={motion.ul}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`absolute z-50 w-full mt-2 bg-surface border ${borderColorClass} rounded-[8px] py-2 shadow-lg outline-none overflow-hidden`}
                >
                  {options.map((option) => (
                    <Listbox.Option
                      key={option.id}
                      value={option}
                      className={({ active }) =>
                        `flex items-center justify-between px-4 py-2 cursor-pointer transition-colors ${
                          active ? 'bg-gray-200/50' : 'bg-transparent'
                        }`
                      }
                    >
                      <span className="text-label text-text-label font-noto">
                        {option.label}
                      </span>

                      {option.icon && (
                        <div className="flex items-center justify-center w-6 h-6">
                          {option.icon}
                        </div>
                      )}

                      {option.subLabel && (
                        <span className="text-label text-text-label font-noto">{option.subLabel}</span>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              )}
            </AnimatePresence>
          </div>
        )}
      </Listbox>
    </div>
  );
};

export default DropDown;
