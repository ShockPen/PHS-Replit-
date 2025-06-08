"use client"

import type React from "react"
import { createContext, useContext } from "react"

interface TabsContextType {
    value: string
    onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

function useTabs() {
    const context = useContext(TabsContext)
    if (!context) {
        throw new Error("Tabs components must be used within a Tabs provider")
    }
    return context
}

interface TabsProps {
    value: string
    onValueChange: (value: string) => void
    children: React.ReactNode
    className?: string
}

export function Tabs({ value, onValueChange, children, className = "" }: TabsProps) {
    return (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    )
}

interface TabsListProps {
    children: React.ReactNode
    className?: string
}

export function TabsList({ children, className = "" }: TabsListProps) {
    return (
        <div className={`inline-flex items-center justify-center rounded-md bg-gray-700 p-1 ${className}`}>{children}</div>
    )
}

interface TabsTriggerProps {
    value: string
    children: React.ReactNode
    className?: string
}

export function TabsTrigger({ value, children, className = "" }: TabsTriggerProps) {
    const { value: selectedValue, onValueChange } = useTabs()
    const isActive = selectedValue === value

    return (
        <button
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                isActive ? "bg-gray-800 text-white shadow-sm" : "text-gray-400 hover:text-gray-300"
            } ${className}`}
            onClick={() => onValueChange(value)}
        >
            {children}
        </button>
    )
}

interface TabsContentProps {
    value: string
    children: React.ReactNode
    className?: string
}

export function TabsContent({ value, children, className = "" }: TabsContentProps) {
    const { value: selectedValue } = useTabs()
    const isActive = selectedValue === value

    if (!isActive) return null

    return <div className={className}>{children}</div>
}
