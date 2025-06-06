"use client"

import { useState } from "react"

interface SwitchProps {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
    id?: string
    className?: string
}

export function Switch({ checked = false, onCheckedChange, disabled = false, id, className = "" }: SwitchProps) {
    const [isChecked, setIsChecked] = useState(checked)

    const handleChange = () => {
        if (disabled) return

        const newValue = !isChecked
        setIsChecked(newValue)
        onCheckedChange?.(newValue)
    }

    return (
        <button
            role="switch"
            aria-checked={isChecked}
            id={id}
            disabled={disabled}
            onClick={handleChange}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                isChecked ? "bg-blue-600" : "bg-gray-600"
            } ${className}`}
        >
      <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
              isChecked ? "translate-x-5" : "translate-x-1"
          }`}
      />
        </button>
    )
}
