import React from "react";
import { cn } from "../../lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: "default" | "panel";
}

export function GlassCard({ children, className, variant = "default", ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                variant === "default" ? "glass-card" : "glass-panel",
                "p-6",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
