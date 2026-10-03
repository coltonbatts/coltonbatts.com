// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://coltonbatts.com',
	// Astro binds ::1 only by default, which leaves 127.0.0.1 refused and breaks
	// readiness probes and anything expecting an IPv4 loopback dev server.
	// `astro dev --host` still overrides this for LAN testing.
	server: { host: '127.0.0.1' },
	// Preserve pre-v7 whitespace handling; the typography leans on
	// spaces between inline elements.
	compressHTML: true,
	integrations: [sitemap()],
	vite: {
		plugins: [tailwindcss()],
	},
});
