/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme")
module.exports = {
  // Hugo-only: classes come from the templates, the client JS (which adds
  // classes dynamically), and the prepared post content. The old glob also
  // scanned the Astro/Svelte/TS sources, which were removed.
  content: ["./layouts/**/*.html", "./src/js/**/*.js", "./.hugo/content/**/*.md"],
  darkMode: "class", // allows toggling dark mode manually
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "sans-serif", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
