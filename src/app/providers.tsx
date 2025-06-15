"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider } from "next-themes";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem
      themes={['light', 'dark']}
    >
      <HeroUIProvider>
        {children}
      </HeroUIProvider>
    </ThemeProvider>
  );
}
