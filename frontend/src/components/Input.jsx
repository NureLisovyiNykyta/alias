import React, { forwardRef, useCallback, useState } from 'react';
import rightArrow from '@/assets/rightArrow.svg';
import { Link } from "react-router-dom";
import eye from "@/assets/eye.svg";
import closedEye from "@/assets/closedEye.svg";

const FORGOT_PASS_LINK = '/auth/forgot-password';

const Input = forwardRef(({ label = '', placeholder = '', type = 'text', showArrow = true, helpText = null, id, error, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="flex flex-col gap-2 w-[280px]">
      <label htmlFor={id} className="font-noto text-p">{label}</label>

      <div
        className={`flex bg-surface items-center border ${error ? 'border-red-500' : 'border-text-label'} rounded-[8px] py-[10px] px-4 justify-between w-full h-[48px] transition-colors`}
      >
        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          ref={ref}
          className="bg-transparent w-full outline-none text-label font-noto placeholder:text-text-label"
          {...props}
        />

        {showArrow &&
          <button
            type="button"
            className="flex items-center justify-center w-8 h-6 rounded-[8px] bg-brand-500"
          >
            <img src={rightArrow} alt=""/>
          </button>
        }

        {type === 'password' &&
          <button
            className='flex items-center justify-center w-6 h-6'
            type="button"
            onClick={() => setShowPassword(!showPassword)}
          >
            <img src={showPassword ? closedEye : eye} alt="Show Password Eye"/>
          </button>
        }
      </div>

      {helpText && (
        <div className='flex items-center justify-between'>
          <span className={`text-label font-noto ${error ? 'text-red-500' : 'text-text-label'}`}>
            {helpText}
          </span>
          {type === 'password' && <Link to={FORGOT_PASS_LINK} className='text-label text-text-label font-noto hover:text-blue-500 transition-colors'>Forgot password?</Link>}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
