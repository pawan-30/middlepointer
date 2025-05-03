"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from 'lucide-react'
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Initialize theme based on system preference or localStorage
  useEffect(() => {
    const isDark = localStorage.getItem("darkMode") === "true" || 
      (!localStorage.getItem("darkMode") && 
       window.matchMedia("(prefers-color-scheme: dark)").matches)
    
    setIsDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  // Toggle theme
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    
    if (newDarkMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("darkMode", "true")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("darkMode", "false")
    }
  }

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      className="rounded-full"
      aria-label="Toggle theme"
    >
      {isDarkMode ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
    </Button>
  )
}