/** @type {import('tailwindcss').Config} */
export default {
   content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
   theme: {
      extend: {
         colors:{
            'background': '#fafafa',
            'primary': '#d00404',
            'secondary': '#faf2f2',
            'primarydark': '#d00404',
            'primarylight':'#fccfcf',
         }

      },
   },
   plugins: [],
};
