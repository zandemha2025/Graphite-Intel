import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("stratix:theme") as
      | "light"
      | "dark"
      | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  // Apply theme to document
  const applyTheme = (newTheme: "light" | "dark") => {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    localStorage.setItem("stratix:theme", newTheme);
  };

  // Toggle between light and dark
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  if (theme === null) {
    return null; // Prevent hydration mismatch
  }

  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors relative"
    >
      {theme === "dark" ? (
        <Sun className="h-[18px] w-[18px] text-[var(--sidebar-text)] hover:text-[var(--text-secondary)]" />
      ) : (
        <Moon className="h-[18px] w-[18px] text-[var(--sidebar-text)] hover:text-[var(--text-secondary)]" />
      )}
    </button>
  );
}
