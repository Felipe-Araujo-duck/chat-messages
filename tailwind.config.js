/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2C6BED",  // azul principal
        secondary: "#E6F0FF", // azul claro
        accent: "#1A1F36",    // azul escuro (texto)
      },
    },
  },
  plugins: [],
};