import React from "react";
import { cn } from "../../lib/utils";

interface AppShellProps {
    children: React.ReactNode;
    className?: string;
    sidebar?: React.ReactNode;
}

export function AppShell({ children, className, sidebar }: AppShellProps) {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
            {/* Sidebar Area */}
            {sidebar && (
                <aside className="w-64 flex-shrink-0 glass-panel border-r border-white/10 z-20">
                    {sidebar}
                </aside>
            )}

            {/* Main Content Area */}
            <main className={cn("flex-1 relative overflow-hidden", className)}>
                {/* Abstract shapes/glows for premium feel */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[100px]" />
                </div>

                <div className="h-full w-full p-6 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
