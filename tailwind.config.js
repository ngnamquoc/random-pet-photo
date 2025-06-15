import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: "#ffffff",
            foreground: "#171717",
            content1: "#ffffff",
            content2: "#f4f4f5",
            content3: "#e4e4e7",
            content4: "#d4d4d8",
          },
        },
        dark: {
          colors: {
            background: "#0a0a0a",
            foreground: "#ededed",
            content1: "#1a1a1a",
            content2: "#262626",
            content3: "#404040",
            content4: "#525252",
          },
        },
      },
    }),
  ],
}
