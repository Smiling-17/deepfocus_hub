import { useMemo, useState } from "react";
import clsx from "classnames";

const AnimatedInput = ({
  label,
  id,
  name,
  type = "text",
  autoComplete,
  value,
  onChange,
  onBlur,
  error
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const letters = useMemo(() => {
    if (!label) {
      return [];
    }
    return [...label].map((char, index) => ({
      char: char === " " ? "\u00A0" : char,
      index
    }));
  }, [label]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (event) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  const isFilled = Boolean(value);
  const containerClass = clsx("styled-input", {
    active: isFocused,
    filled: isFilled,
    "has-error": Boolean(error)
  });

  return (
    <div className={containerClass}>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="styled-input__input"
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      <div className="styled-input__placeholder">
        <span className="styled-input__placeholder-text">
          {letters.map((letter) => (
            <span
              key={`${id}-${letter.index}`}
              className="letter"
              style={{ "--letter-index": letter.index }}
            >
              {letter.char}
            </span>
          ))}
        </span>
      </div>
      <div className="styled-input__circle" />
      {error && <p className="styled-input__error">{error}</p>}
    </div>
  );
};

export default AnimatedInput;
