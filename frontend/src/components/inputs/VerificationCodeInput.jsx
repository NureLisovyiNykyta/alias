import React, { useRef, useState, useEffect } from 'react';

const VerificationCodeInput = ({ length = 6, value = '', onChange, error, isValid }) => {
  const [code, setCode] = useState(Array(length).fill(''));
  const inputs = useRef([]);

  useEffect(() => {
    if (value) {
      setCode(value.split('').slice(0, length).concat(Array(length - value.length).fill('')));
    } else {
      setCode(Array(length).fill(''));
    }
  }, [value, length]);

  const processInput = (e, slot) => {
    const num = e.target.value;
    if (/[^0-9]/.test(num)) return;

    const newCode = [...code];
    newCode[slot] = num;
    setCode(newCode);
    onChange(newCode.join(''));

    if (slot !== length - 1 && num !== '') {
      inputs.current[slot + 1].focus();
    }
  };

  const onKeyUp = (e, slot) => {
    if (e.keyCode === 8 && !code[slot] && slot !== 0) {
      const newCode = [...code];
      newCode[slot - 1] = '';
      setCode(newCode);
      onChange(newCode.join(''));
      inputs.current[slot - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length).replace(/[^0-9]/g, '');
    const newCode = pastedData.split('').concat(Array(length - pastedData.length).fill(''));
    setCode(newCode);
    onChange(newCode.join(''));

    const focusIndex = pastedData.length < length ? pastedData.length : length - 1;
    inputs.current[focusIndex].focus();
  };

  let borderColorClass = 'border-text-label';
  if (error) borderColorClass = 'border-red-500';

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {code.map((num, idx) => (
        <input
          key={idx}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={num}
          autoFocus={!code[0].length && idx === 0}
          onChange={(e) => processInput(e, idx)}
          onKeyUp={(e) => onKeyUp(e, idx)}
          ref={(ref) => inputs.current.push(ref)}
          className={`w-[48px] h-[48px] text-center text-h2 bg-surface border ${borderColorClass} rounded-[12px] outline-none focus:outline-none transition-colors`}
        />
      ))}
    </div>
  );
};

export default VerificationCodeInput;