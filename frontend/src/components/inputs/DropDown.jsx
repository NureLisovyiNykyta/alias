import { Listbox } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import dropDownArrow from '@/assets/dropDownArrow.svg';
import Spinner from '@/components/layouts/Spinner.jsx';

const DropDown = ({
                    label,
                    placeholder = 'Choose the card pack type',
                    options = [],
                    value,
                    onChange,
                    width = 'w-[260px]',
                    error,
                    isValid = false,
                    withSearch = false,
                    searchValue = '',
                    onSearchChange,
                    isLoading = false,
                    scopeOptions = [],
                    activeScope = '',
                    onScopeChange,
                    secondaryScopeOptions = [],
                    activeSecondaryScope = '',
                    onSecondaryScopeChange,
                    onLoadMore,
                    hasNextPage = false,
                    isFetchingNextPage = false,
                  }) => {
  let borderColorClass = 'border-text-label';
  if (error) {
    borderColorClass = 'border-red-500';
  } else if (isValid) {
    borderColorClass = 'border-decorative-700';
  }

  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 10) {
      if (onLoadMore && hasNextPage && !isFetchingNextPage) {
        onLoadMore();
      }
    }
  };

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
                  modal={false}
                  static
                  as={motion.ul}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`absolute z-50 w-full mt-2 bg-surface border ${borderColorClass} rounded-[8px] py-2 shadow-lg outline-none overflow-hidden`}
                >
                  {withSearch && (
                    <div className="flex flex-col gap-2 px-3 pb-2 mb-2 border-b border-text-label/30">
                      <input
                        type="text"
                        className="w-full bg-white border border-text-label/50 rounded-[6px] px-3 py-1.5 text-label font-noto outline-none focus:border-brand-500"
                        placeholder="Search..."
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />

                      <div className='flex flex-col gap-1'>
                        {scopeOptions.length > 0 && (
                          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                            {scopeOptions.map((scope) => (
                              <button
                                key={scope.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onScopeChange) onScopeChange(scope.id);
                                }}
                                className={`w-full py-1 px-2 text-[12px] font-btn rounded-[6px] transition-colors whitespace-nowrap ${
                                  activeScope === scope.id
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-white border border-text-label/30 text-text hover:border-brand-500'
                                }`}
                              >
                                {scope.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {secondaryScopeOptions.length > 0 && (
                          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                            {secondaryScopeOptions.map((scope) => (
                              <button
                                key={scope.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSecondaryScopeChange) onSecondaryScopeChange(scope.id);
                                }}
                                className={`w-full py-1 px-2 text-[12px] font-btn rounded-[6px] transition-colors whitespace-nowrap ${
                                  activeSecondaryScope === scope.id
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-white border border-text-label/30 text-text hover:border-brand-500'
                                }`}
                              >
                                {scope.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isLoading ? (
                    <div className="flex justify-center items-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : options.length === 0 ? (
                    <div className="px-4 py-3 text-center text-label text-text-label font-noto">
                      No options found
                    </div>
                  ) : (
                    <div
                      className="max-h-[250px] overflow-y-auto"
                      onScroll={handleScroll}
                    >
                      {options.map((option) => (
                        <Listbox.Option
                          key={option.id}
                          value={option}
                          className={({ active }) =>
                            `flex items-center px-4 py-2 cursor-pointer transition-colors ${option.subLabel ? 'justify-between' : 'gap-2'} ${
                              active ? 'bg-gray-200/50' : 'bg-transparent'
                            }`
                          }
                        >
                          {option.image && (
                            <img src={option.image} alt='' className='size-8 rounded-[8px] object-cover' />
                          )}
                          <span className="text-label text-text-label font-noto truncate pr-2">
                            {option.label}
                          </span>

                          {option.subLabel && (
                            <span className="text-text-label text-label font-noto">
                              {option.subLabel}
                            </span>
                          )}
                        </Listbox.Option>
                      ))}

                      {isFetchingNextPage && (
                        <div className="flex justify-center items-center py-2">
                          <Spinner size="sm" />
                        </div>
                      )}
                    </div>
                  )}
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
