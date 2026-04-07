import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-[#FAFAFA]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-9 w-full rounded-lg border border-[#27272A] bg-[#18181B] px-3 text-sm text-[#FAFAFA] placeholder:text-[#71717A] transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]",
            error && "border-red-400 focus:border-red-400 focus:ring-red-400/20",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
