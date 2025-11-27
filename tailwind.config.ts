import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // Geo Dastaan Portal Brand Colors
        brand: {
          blue: "#224794",
          orange: "#f79224",
        },
        // Luxury Minimal - Monochromatic Neutral Palette
        neutral: {
          50: "rgb(250, 250, 250)",
          100: "rgb(245, 245, 245)",
          200: "rgb(235, 235, 235)",
          300: "rgb(212, 212, 212)",
          400: "rgb(163, 163, 163)",
          500: "rgb(115, 115, 115)",
          600: "rgb(82, 82, 82)",
          700: "rgb(64, 64, 64)",
          800: "rgb(38, 38, 38)",
          900: "rgb(23, 23, 23)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      width: {
        "70": "280px", // 17.5rem - Sidebar expanded width
      },
      spacing: {
        "70": "280px", // For margin/padding utilities
      },
      // Luxury Minimal - Custom letter spacing
      letterSpacing: {
        tighter: "-0.03em",
        tight: "-0.015em",
        normal: "-0.01em",
        wide: "0.025em",
      },
      // Luxury Minimal - Extended font sizes
      fontSize: {
        xs: ["0.6875rem", { lineHeight: "1rem" }],      // 11px - micro labels
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],   // 13px - secondary text
        base: ["0.9375rem", { lineHeight: "1.5rem" }],  // 15px - body
        lg: ["1.125rem", { lineHeight: "1.75rem" }],    // 18px - subheadings
        xl: ["1.5rem", { lineHeight: "2rem" }],         // 24px - headings
        "2xl": ["2rem", { lineHeight: "2.5rem" }],      // 32px - stats
        "3xl": ["3rem", { lineHeight: "1" }],           // 48px - hero stats
      },
      // Luxury Minimal - Extended font weights
      fontWeight: {
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        black: "800",
      },
      // Luxury Minimal - Custom box shadows
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.06)",
        DEFAULT: "0 4px 6px -1px rgba(0, 0, 0, 0.06)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.06)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        inset: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)",
      },
      // Luxury Minimal - Custom animation timing
      transitionDuration: {
        fast: "200ms",
        normal: "300ms",
        slow: "400ms",
      },
      transitionTimingFunction: {
        luxury: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        subtle: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      // Luxury Minimal - Backdrop blur support
      backdropBlur: {
        luxury: "20px",
        "luxury-mobile": "12px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
