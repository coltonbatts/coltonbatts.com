/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				charcoal: '#1a1a1a',
				manual: '#f4f4f2',
			},
			fontFamily: {
				outfit: ['Outfit', 'sans-serif'],
			},
			letterSpacing: {
				tight: '-0.02em',
				tighter: '-0.04em',
			}
		},
	},
	plugins: [],
}
