/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"El Messiri"', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#f0fdf2',
                    100: '#dcfce3',
                    200: '#bbf7c9',
                    300: '#86efa1',
                    400: '#4ade73',
                    500: '#3ca92e', // The requested base color
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                }
            }
        },
    },
    plugins: [],
}
