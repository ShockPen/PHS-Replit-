// app/components/ui/scroll-area.tsx
import React, { ReactNode } from "react";
import classNames from "classnames";

interface ScrollAreaProps {
    children: ReactNode;
    className?: string;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({ children, className }) => {
    return (
        <div
            className={classNames(
                "relative overflow-auto rounded border border-gray-200",
                className
            )}
        >
            {children}
        </div>
    );
};
