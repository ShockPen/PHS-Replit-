import type React from "react"

interface BadgeProps {
    variant?: "default" | "secondary" | "destructive" | "outline"
    children: React.ReactNode
    className?: string
}

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
    const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"

    const variantStyles = {
        default: "bg-blue-600 text-white",
        secondary: "bg-yellow-600 text-white",
        destructive: "bg-red-600 text-white",
        outline: "text-white border border-gray-600",
    }

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`

    return <span className={combinedClassName}>{children}</span>
}
