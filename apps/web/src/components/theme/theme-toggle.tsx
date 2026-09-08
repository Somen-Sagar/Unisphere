"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const modes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function ThemeToggle() {
  const { theme = "system", setTheme } = useTheme();

  return (
    <div className="theme-toggle" aria-label="Theme" suppressHydrationWarning>
      {modes.map((mode) => {
        const Icon = mode.icon;
        const active = theme === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            aria-label={`${mode.label} theme`}
            aria-pressed={active}
            className={active ? "active" : ""}
            onClick={() => setTheme(mode.value)}
            title={`${mode.label} theme`}
          >
            <Icon aria-hidden="true" size={15} />
          </button>
        );
      })}
    </div>
  );
}
