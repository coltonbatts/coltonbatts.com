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
 * PAINTINGS COLLECTION (Client Projects)
 * Professional production work — the portfolio.
 *
 * Fields:
 *   title       — Client / project name
 *   medium      — Role (e.g. "Lead Video Editor")
 *   dimensions  — Scope (e.g. "30+ Campaign Assets")
 *   year        — Year of engagement
 *   image       — Path to the image in /public/art/paintings/
 *   featured    — Whether to highlight in the gallery layout
 *   series      — Category for grouping
 *   available   — (unused — retained for schema compat)
 *   order       — Sort order (lower = first)
 *   vimeoId     — Optional Vimeo video ID for inline playback
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
		vimeoId: z.string().optional(),
	}),
});

const nowCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string().optional(),
		date: z.coerce.date(),
		summary: z.string().optional(),
		links: z
			.array(
				z.object({
					label: z.string().optional(),
					url: z.string().url(),
				})
			)
			.optional(),
	}),
});

export const collections = {
	tools: toolsCollection,
	paintings: paintingsCollection,
	now: nowCollection,
};
