// PostCSS config for the Tailwind CLI (build-css.mjs).
// Order: import -> nesting -> tailwind -> autoprefixer.
module.exports = {
  plugins: {
    "postcss-import": {},
    "tailwindcss/nesting": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
