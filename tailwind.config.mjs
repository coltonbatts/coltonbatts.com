/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		/* -------------------------------------------------------
		 * BORDER RADIUS: KILLED.
		 * Everything is square. No exceptions. This override
		 * sets every Tailwind radius token to 0.
		 * ------------------------------------------------------- */
		borderRadius: {
			none: '0',
			sm: '0',
			DEFAULT: '0',
			md: '0',
			lg: '0',
			xl: '0',
			'2xl': '0',
			'3xl': '0',
			full: '0',
		},

		extend: {
			/* -- COLOR PALETTE ---------------------------------- */
			colors: {
				charcoal: '#ffffff',
				manual: '#000000',
				'manual-light': '#000000',
				raw: '#ffffff',
				'raw-dark': '#ffffff',
				ink: '#ffffff',
				bone: '#000000',
			},

			/* -- FONT FAMILIES ---------------------------------- */
			fontFamily: {
				mono: [
					'"IBM Plex Mono"',
					'ui-monospace',
					'SFMono-Regular',
					'Menlo',
					'monospace',
				],
				sans: [
					'"Geist Pixel"',
					'"Inter"',
					'system-ui',
					'-apple-system',
					'BlinkMacSystemFont',
					'sans-serif',
				],
			},

			/* -- FONT SIZE SCALE --------------------------------
			 * Oversized display sizes for the "steel beam" headline
			 * system. Standard sizes preserved via Tailwind defaults.
			 * --------------------------------------------------- */
			fontSize: {
				/* Standard Scale (Readable) */
				'xs': ['0.8125rem', { lineHeight: '1.5' }],   /* 13px */
				'sm': ['0.875rem', { lineHeight: '1.5' }],    /* 14px */
				'base': ['1rem', { lineHeight: '1.6' }],      /* 16px */
				'lg': ['1.125rem', { lineHeight: '1.6' }],    /* 18px */
				'xl': ['1.25rem', { lineHeight: '1.6' }],     /* 20px */
				'2xl': ['1.5rem', { lineHeight: '1.4' }],     /* 24px */
				'3xl': ['1.875rem', { lineHeight: '1.3' }],   /* 30px */
				'4xl': ['2.25rem', { lineHeight: '1.2' }],    /* 36px */
				
				/* Display Scale */
				'display-sm': ['2rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '900' }],
				'display': ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '900' }],
				'display-lg': ['3.5rem', { lineHeight: '1.0', letterSpacing: '-0.04em', fontWeight: '900' }],
				'display-xl': ['4.5rem', { lineHeight: '0.95', letterSpacing: '-0.05em', fontWeight: '900' }],
				'label': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.12em', fontWeight: '700' }],
				'meta': ['0.625rem', { lineHeight: '1.5', letterSpacing: '0.2em', fontWeight: '700' }],
			},

			/* -- LETTER SPACING --------------------------------- */
			letterSpacing: {
				tight: '-0.02em',
				tighter: '-0.04em',
				tightest: '-0.05em',
				instrument: '0.12em',    /* For mono labels */
			},

			/* -- BORDER WIDTH ----------------------------------- */
			borderWidth: {
				DEFAULT: '2px',          /* The new minimum. Stamped. */
				'1': '1px',              /* Escape hatch for subtle dividers */
				'2': '2px',
				'3': '3px',
				'4': '4px',
			},

			/* -- BOX SHADOW: STAMPED SYSTEM ---------------------
			 * No soft glows. These are offset block shadows that
			 * feel like physical depth — letterpress, not glass.
			 * --------------------------------------------------- */
			boxShadow: {
				'stamp-sm': '1px 1px 0px currentColor',
				'stamp': '2px 2px 0px currentColor',
				'stamp-md': '3px 3px 0px currentColor',
				'stamp-lg': '5px 5px 0px currentColor',
				'stamp-hover': '4px 4px 0px currentColor',
				'none': 'none',
			},

			/* -- SPACING ---------------------------------------- */
			spacing: {
				'18': '4.5rem',
				'22': '5.5rem',
				'30': '7.5rem',
			},

			/* -- TRANSITION ------------------------------------- */
			transitionTimingFunction: {
				'stamp': 'cubic-bezier(0.2, 0, 0, 1)',
			},
		},
	},
	plugins: [],
};
