import { defineCollection, z } from 'astro:content';

/* -----------------------------------------------------------
 * TOOLS COLLECTION
 * Software projects — ColorWizard, Magpie, etc.
 * ----------------------------------------------------------- */

const toolsCollection = defineCollection({
	type: 'content',
	schema: z.object({
		name: z.string(),
		oneLiner: z.string(),
		status: z.enum(['active', 'beta', 'archived']),
		platform: z.string(),
		links: z.array(z.object({
			label: z.string(),
			url: z.string().url(),
		})),
		heroImage: z.string().optional(),
		bullets: z.array(z.string()),

		/* Deep-dive fields — optional for backward compat */
		version: z.string().optional(),
		lastUpdated: z.string().optional(),
		techStack: z.array(z.string()).optional(),
		repoUrl: z.string().url().optional(),
		ownershipType: z.string().optional(),
		hardware: z.object({
			minimum: z.string(),
			recommended: z.string(),
			notes: z.string().optional(),
		}).optional(),
	}),
});

/* -----------------------------------------------------------
 * PAINTINGS COLLECTION
 * Oil paintings — the gallery. Each entry is a physical work.
 *
 * Fields:
 *   title       — Name of the work
 *   medium      — e.g. "Oil on Canvas", "Oil on Panel"
 *   dimensions  — e.g. "48 × 36 in" or "122 × 91 cm"
 *   year        — Year completed
 *   image       — Path to the image in /public/art/paintings/
 *   featured    — Whether to highlight in the gallery layout
 *   series      — Optional series name for grouping
 *   available   — Whether the work is for sale
 *   order       — Sort order (lower = first)
 * ----------------------------------------------------------- */

const paintingsCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		medium: z.string(),
		dimensions: z.string(),
		year: z.number(),
		image: z.string(),
		featured: z.boolean().default(false),
		series: z.string().optional(),
		available: z.boolean().default(false),
		order: z.number().default(0),
	}),
});

export const collections = {
	tools: toolsCollection,
	paintings: paintingsCollection,
};
