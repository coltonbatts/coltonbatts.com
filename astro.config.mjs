// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
	site: 'https://coltonbatts.com',
	// Preserve pre-v7 whitespace handling; the typography leans on
	// spaces between inline elements.
	compressHTML: true,
	integrations: [tailwind()],
});
