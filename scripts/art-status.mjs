import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { artManifest } from '../src/content/art-manifest.ts';

const cwd = process.cwd();
const publicDir = resolve(cwd, 'public');
const isGalleryMode = artManifest.mode === 'gallery';

function resolvePublicPath(src) {
	if (!src) return null;
	if (/^https?:\/\//.test(src)) {
		return { src, resolved: src, exists: true, external: true };
	}
	const cleanSrc = src.replace(/^\//, '');
	const resolved = resolve(publicDir, cleanSrc);
	return { src, resolved, exists: existsSync(resolved), external: false };
}

function isToolEnabled(slot) {
	if (!slot) return false;
	if (isGalleryMode) return slot.enabled === true;
	return slot.enabled === true;
}

const slots = [
	{ key: 'hero', slot: artManifest.hero, enabled: artManifest.hero.enabled === true },
	...Object.entries(artManifest.tools).map(([key, slot]) => ({
		key: `tools.${key}`,
		slot,
		enabled: isToolEnabled(slot),
	})),
	{ key: 'motion', slot: artManifest.motion, enabled: artManifest.motion.enabled === true },
];

const enabledSlots = slots.filter((entry) => entry.enabled);
const referencedPaths = [];
const missingFiles = [];

for (const entry of slots) {
	const primary = resolvePublicPath(entry.slot?.src);
	const fallback = resolvePublicPath(entry.slot?.fallbackSrc);
	if (primary) {
		referencedPaths.push({ slot: `${entry.key}.src`, ...primary });
		if (!primary.exists) missingFiles.push({ slot: `${entry.key}.src`, ...primary });
	}
	if (fallback) {
		referencedPaths.push({ slot: `${entry.key}.fallbackSrc`, ...fallback });
		if (!fallback.exists) missingFiles.push({ slot: `${entry.key}.fallbackSrc`, ...fallback });
	}
}

console.log('Art Manifest Status');
console.log(`Mode: ${artManifest.mode}`);
console.log('');

console.log('Enabled slots:');
if (enabledSlots.length === 0) {
	console.log('  (none)');
} else {
	for (const entry of enabledSlots) {
		console.log(`  - ${entry.key} (${entry.slot.type})`);
	}
}

console.log('');
console.log('Missing files:');
if (missingFiles.length === 0) {
	console.log('  (none)');
} else {
	for (const item of missingFiles) {
		const suffix = item.external ? ' [external]' : '';
		console.log(`  - ${item.slot}: ${item.src} -> ${item.resolved}${suffix}`);
	}
}

console.log('');
console.log('Resolved paths:');
for (const item of referencedPaths) {
	const state = item.external ? 'external' : item.exists ? 'exists' : 'missing';
	console.log(`  - ${item.slot}: ${item.src} -> ${item.resolved} (${state})`);
}
