import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';
import { Select, type SelectOption } from './Select';

const CONTROL =
  'w-full rounded-md border-hair bg-surface px-3 text-md text-fg placeholder:text-muted aria-invalid:border-danger';

interface FieldFrameProps {
  label: string;
  error?: string | undefined;
  hint?: string;
  controlId: string;
  children: ReactNode;
  className?: string;
}

function FieldFrame({ label, error, hint, controlId, children, className }: FieldFrameProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={controlId} className="text-base font-medium text-soft">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-muted">{hint}</p>}
      {error && (
        <p id={`${controlId}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string | undefined;
  hint?: string;
  wrapperClassName?: string;
}

export function TextField({
  label,
  error,
  hint,
  wrapperClassName,
  className,
  ...rest
}: TextFieldProps) {
  const id = useId();
  return (
    <FieldFrame
      label={label}
      error={error}
      controlId={id}
      className={wrapperClassName}
      {...(hint ? { hint } : {})}
    >
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(CONTROL, 'h-select', className)}
        {...rest}
      />
    </FieldFrame>
  );
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  error?: string | undefined;
}

export function TextAreaField({ label, error, className, ...rest }: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldFrame label={label} error={error} controlId={id}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(CONTROL, 'min-h-textarea resize-y py-2', className)}
        {...rest}
      />
    </FieldFrame>
  );
}

interface SelectFieldProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'children'
> {
  label: string;
  options: readonly SelectOption[];
  error?: string | undefined;
  wrapperClassName?: string;
}

export function SelectField({
  label,
  options,
  error,
  wrapperClassName,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  return (
    <FieldFrame label={label} error={error} controlId={id} className={wrapperClassName}>
      <Select
        id={id}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        options={options}
        className="w-full"
        {...rest}
      />
    </FieldFrame>
  );
}
