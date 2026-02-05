import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const publicDir = path.join(root, 'public');

const fileExtensions = new Set(['.astro', '.md', '.mdx', '.js', '.jsx', '.ts', '.tsx']);
const matches = new Set();

const walk = (dir) => {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	entries.forEach((entry) => {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(fullPath);
			return;
		}
		if (!fileExtensions.has(path.extname(entry.name))) return;
		const content = fs.readFileSync(fullPath, 'utf8');
		const regex = /<Rive\b[^>]*\bsrc\s*=\s*(?:\{\s*)?["'](\/rive\/[^"']+\.riv)["']\s*(?:\})?/g;
		let match;
		while ((match = regex.exec(content))) {
			matches.add(match[1]);
		}
	});
};

if (fs.existsSync(srcDir)) {
	walk(srcDir);
}

const missing = [];

for (const src of matches) {
	const rel = src.replace(/^\//, '');
	const fullPath = path.join(publicDir, rel);
	if (!fs.existsSync(fullPath)) {
		missing.push(src);
	}
}

if (missing.length) {
	console.error('Missing Rive assets:');
	missing.forEach((src) => console.error(`- ${src}`));
	process.exit(1);
}

process.exit(0);
