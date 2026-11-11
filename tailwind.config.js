import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // SORSU Talk tokens (mirrored as CSS variables in src/index.css)
      colors: {
        ground: "#D7E8E4",
        dot: "#BFD7D2",
        ink: { DEFAULT: "#12302F", hover: "#1E4645" },
        onink: "#EEF6F4",
        muted: { DEFAULT: "#34514E", 2: "#44625F" },
        line: "#B9D2CD",
        paper: "#FFFFFF",
        mist: { DEFAULT: "#F3F8F6", 2: "#EAF3F1" },
        pili: { DEFAULT: "#F5C443", hover: "#FFD45E" },
        coral: { DEFAULT: "#F29E7D", soft: "#FBE3DA" },
        online: { DEFAULT: "#2E9E6B", text: "#2E7A57" },
      },
      fontFamily: {
        display: ['"Familjen Grotesk"', "system-ui", "sans-serif"],
        body: ['"Atkinson Hyperlegible Next"', "system-ui", "sans-serif"],
      },
      screens: {
        // Chat layout breakpoint, and landing / matching breakpoint
        chat: "600px",
        wide: "760px",
      },
      boxShadow: {
        ink: "0 30px 60px -36px rgba(18,48,47,.45)",
        "ink-sm": "0 14px 30px -22px rgba(18,48,47,.5)",
      },
    },
  },
  // daisyUI is still used by the admin screens
  plugins: [daisyui],
  daisyui: {
    themes: [
      "light",
      "dark",
      "cupcake",
      "bumblebee",
      "emerald",
      "corporate",
      "synthwave",
      "retro",
      "cyberpunk",
      "valentine",
      "halloween",
      "garden",
      "forest",
      "aqua",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter",
      "dim",
      "nord",
      "sunset",
    ],
  },
};
