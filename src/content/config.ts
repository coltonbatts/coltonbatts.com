import { defineCollection, z } from 'astro:content';

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
	}),
});

export const collections = {
	tools: toolsCollection,
};
