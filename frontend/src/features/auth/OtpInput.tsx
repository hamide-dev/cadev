import { useRef } from 'react';

export function OtpInput({ value, onChange, invalid }: { value: string; onChange: (code: string) => void; invalid?: boolean }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(4, ' ').slice(0, 4).split('');
  const set = (index: number, digit: string) => {
    const next = digits.map((d, i) => (i === index ? digit : d)).join('').replace(/\s+$/, '');
    onChange(next.replace(/\s/g, ''));
  };
  return (
    <div className="otp" role="group" aria-label="Code à 4 chiffres">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={4}
          aria-label={`Chiffre ${i + 1}`}
          aria-invalid={invalid || undefined}
          value={digit.trim()}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, '');
            if (typed.length > 1) {
              onChange(typed.slice(0, 4));
              refs.current[Math.min(typed.length, 3)]?.focus();
              return;
            }
            set(i, typed);
            if (typed && i < 3) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !digit.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
