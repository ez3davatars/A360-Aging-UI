import React from "react";
import { cn } from "../../lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, ...props }, ref) => {
        return (
            <div className="relative group">
                <input
                    type={type}
                    className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-sm transition-all duration-200",
                        className
                    )}
                    ref={ref}
                    placeholder={label ? " " : props.placeholder}
                    {...props}
                />
                {label && (
                    <label className="absolute left-3 -top-2.5 bg-background px-1 text-xs text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary pointer-events-none">
                        {label}
                    </label>
                )}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }
