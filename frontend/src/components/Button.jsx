import React from 'react';

const baseStyles = "inline-flex items-center justify-center gap-2 font-noto text-btn font-semibold rounded-[12px] cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none transition-all";
const variants = {
  primary: `
    bg-brand-500 text-text
    hover:bg-brand-700 hover:text-white
    active:bg-brand-900 active:text-white
    disabled:bg-surface disabled:text-text-label
    h-[48px]
    min-w-[144px]
  `,
  secondary: `
    bg-brand-100 text-text
    hover:bg-brand-300
    active:bg-brand-500
    disabled:bg-neutral-100 disabled:text-text-label  
    h-[48px]    
    min-w-[144px]
  `,
  tertiary: `
    bg-white border-2 border-surface shadow-buttons text-text
    hover:bg-white hover:border-text-label
    active:bg-white active:border-brand-500
    disabled:border-surface disabled:text-text-label
    h-[48px]
    min-w-[144px]
  `,
};

const sizes = {
  default: "px-8",
  icon: "p-2.5 aspect-square"
};

export const Button = ({
                         variant = 'primary',
                         size = 'default',
                         disabled = false,
                         className = '',
                         children,
                         ...props
                       }) => {
  return (
    <button
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};