# coltonbatts.com

Static site built with Astro. A toolmaker's workshop manual—offline-first, no logins, no subscriptions, no ads.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The site builds to static HTML in `dist/`.

## Structure

- `/` - Home page with manifesto
- `/tools` - Tools index
- `/tools/[slug]` - Individual tool pages (from content collections)
- `/portfolio` - Portfolio
- `/now` - Now page
- `/contact` - Contact

Tools are managed via Astro content collections in `src/content/tools/`.
