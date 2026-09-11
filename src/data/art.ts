/* -----------------------------------------------------------
 * ART ARCHIVE
 * The 24 selected photographs, in manifest order (Instagram likes,
 * descending). Generated from Portfolio/manifest.csv — titles and
 * captions are parsed from that file, never authored here.
 *
 * Source: 1440px on the long edge, the Instagram ceiling. Not
 * originals, not print-ready. Aspect ratios left untouched.
 *
 * Entries whose manifest `name` still reads untitled-* carry
 * `untitled: true` and render as "Untitled, {year}" until named.
 * ----------------------------------------------------------- */

import type { ImageMetadata } from 'astro';

import img01 from '../assets/art/01-untitled-2021.png';
import img02 from '../assets/art/02-365-256.png';
import img03 from '../assets/art/03-365-231.png';
import img04 from '../assets/art/04-untitled-2021-09-24.png';
import img05 from '../assets/art/05-365-253.png';
import img06 from '../assets/art/06-untitled-2021.png';
import img07 from '../assets/art/07-365-227.png';
import img08 from '../assets/art/08-untitled-2021-05-03.png';
import img09 from '../assets/art/09-untitled-2021.png';
import img10 from '../assets/art/10-montgomery-plaza.png';
import img11 from '../assets/art/11-365-218.png';
import img12 from '../assets/art/12-365-232.png';
import img13 from '../assets/art/13-untitled-2021.png';
import img14 from '../assets/art/14-untitled-2021-12-04.png';
import img15 from '../assets/art/15-untitled-2021-09-29.png';
import img16 from '../assets/art/16-untitled-2021-10-02.png';
import img17 from '../assets/art/17-untitled-2021-09-21.png';
import img18 from '../assets/art/18-365-224.png';
import img19 from '../assets/art/19-thinking-about-cotton-candy.png';
import img20 from '../assets/art/20-365-217.png';
import img21 from '../assets/art/21-365-231.png';
import img22 from '../assets/art/22-365-223.png';
import img23 from '../assets/art/23-untitled-2021.png';
import img24 from '../assets/art/24-365-128.png';

export interface Artwork {
	/** 1-based position in the archive. 01 is the most-liked post. */
	order: number;
	title: string;
	/** Caption from manifest.csv, hashtag block stripped. May be empty. */
	caption: string;
	year: number;
	likes: number;
	/** True while manifest.csv still reads untitled-* for this row. */
	untitled: boolean;
	alt: string;
	src: ImageMetadata;
}

export const art: Artwork[] = [
	{
		order: 1,
		title: 'Untitled, 2021',
		caption: '🪔',
		year: 2021,
		likes: 2801,
		untitled: true,
		alt: 'A dark house at night; one window glows red, a white cloth form hangs in the yard.',
		src: img01,
	},
	{
		order: 2,
		title: '365 / 256',
		caption: '📸 256/365🌒',
		year: 2021,
		likes: 1759,
		untitled: false,
		alt: 'A street lamp with a red bulb on a foggy night, a draped white cloth figure standing beneath it.',
		src: img02,
	},
	{
		order: 3,
		title: '365 / 231',
		caption: '📸 231/365🥀',
		year: 2021,
		likes: 1561,
		untitled: false,
		alt: 'A hand reaching up into a cloud of glowing sparks in near-darkness, gold and bronze tones.',
		src: img03,
	},
	{
		order: 4,
		title: 'Untitled, 2021',
		caption: '🔴 🔴',
		year: 2021,
		likes: 1437,
		untitled: true,
		alt: 'A low red-lit building reflected in standing water at night, red signage doubled in the reflection.',
		src: img04,
	},
	{
		order: 5,
		title: '365 / 253',
		caption: '📸 253/365⚰️',
		year: 2021,
		likes: 1407,
		untitled: false,
		alt: 'A storefront at night with a red door panel and white light, a white cloth figure floating above the roofline.',
		src: img05,
	},
	{
		order: 6,
		title: 'Untitled, 2021',
		caption: '🪶',
		year: 2021,
		likes: 798,
		untitled: true,
		alt: 'The silhouette of a tree and a flock of birds against a pale sky, a red glow at its base.',
		src: img06,
	},
	{
		order: 7,
		title: '365 / 227',
		caption: '📸 227/365🥀',
		year: 2021,
		likes: 746,
		untitled: false,
		alt: 'A white cloth draped over a tree branch at night, a house with a red-lit window behind it.',
		src: img07,
	},
	{
		order: 8,
		title: 'Untitled, 2021',
		caption: '🗻',
		year: 2021,
		likes: 666,
		untitled: true,
		alt: 'A minimal dark building corner in haze, a single small red light.',
		src: img08,
	},
	{
		order: 9,
		title: 'Untitled, 2021',
		caption: '🌩',
		year: 2021,
		likes: 663,
		untitled: true,
		alt: 'A magenta-pink sky with a dark figure suspended in the air beside a bolt of lightning.',
		src: img09,
	},
	{
		order: 10,
		title: 'Montgomery Plaza',
		caption: 'Montgomery Plaza 🌙',
		year: 2021,
		likes: 625,
		untitled: false,
		alt: 'A white cloth figure raised on a pole at night, red lights and a parked car below.',
		src: img10,
	},
	{
		order: 11,
		title: '365 / 218',
		caption: '📸 218/365🌙',
		year: 2021,
		likes: 619,
		untitled: false,
		alt: 'A teal-lit draped cloth figure in a park at night, a red street lamp overhead.',
		src: img11,
	},
	{
		order: 12,
		title: '365 / 232',
		caption: '📸 232/365🌒',
		year: 2021,
		likes: 595,
		untitled: false,
		alt: 'A red circular light above a draped cloth figure, a house behind it in blue night.',
		src: img12,
	},
	{
		order: 13,
		title: 'Untitled, 2021',
		caption: '☁️',
		year: 2021,
		likes: 520,
		untitled: true,
		alt: 'A house on a residential street with a dark mass suspended above it against a pale grey sky.',
		src: img13,
	},
	{
		order: 14,
		title: 'Untitled, 2021',
		caption: 'gm',
		year: 2021,
		likes: 498,
		untitled: true,
		alt: 'A very dark interior or alley, near-black, with faint light at the far end.',
		src: img14,
	},
	{
		order: 15,
		title: 'Untitled, 2021',
		caption: '🐺',
		year: 2021,
		likes: 498,
		untitled: true,
		alt: 'A wet street at night with red and green neon reflections and a figure passing through.',
		src: img15,
	},
	{
		order: 16,
		title: 'Untitled, 2021',
		caption: '♾️',
		year: 2021,
		likes: 489,
		untitled: true,
		alt: 'A white cloth form on a windowsill in a dark room lit by one bright window.',
		src: img16,
	},
	{
		order: 17,
		title: 'Untitled, 2021',
		caption: '👻',
		year: 2021,
		likes: 487,
		untitled: true,
		alt: 'A dark field at dusk with a long-haired figure standing in tall grass beneath a moon.',
		src: img17,
	},
	{
		order: 18,
		title: '365 / 224',
		caption: '📸 224/365♾️',
		year: 2021,
		likes: 485,
		untitled: false,
		alt: 'A night field of stars with a white cloth-covered form standing in dry grass.',
		src: img18,
	},
	{
		order: 19,
		title: 'Thinking About Cotton Candy',
		caption: 'thinking about cotton candy today. ☁',
		year: 2022,
		likes: 483,
		untitled: false,
		alt: 'A figure in a pink dress standing in a foggy field with a transmission tower behind, muted colour.',
		src: img19,
	},
	{
		order: 20,
		title: '365 / 217',
		caption: '📸 217/365🌊',
		year: 2021,
		likes: 482,
		untitled: false,
		alt: 'A blue-lit draped cloth figure beneath a street lamp at night.',
		src: img20,
	},
	{
		order: 21,
		title: '365 / 231',
		caption: '📸 231/365🔴',
		year: 2021,
		likes: 481,
		untitled: false,
		alt: 'A figure in white cloth standing in a park at dusk, a red light nearby.',
		src: img21,
	},
	{
		order: 22,
		title: '365 / 223',
		caption: '📸 223/365🌐',
		year: 2021,
		likes: 437,
		untitled: false,
		alt: 'A black cloud of smoke with a pale gold ring above it over a dusk horizon and an orange streetlight.',
		src: img22,
	},
	{
		order: 23,
		title: 'Untitled, 2021',
		caption: '▪️',
		year: 2021,
		likes: 431,
		untitled: true,
		alt: 'Black and white: a figure with arms out and a bright burst of white smoke above the head.',
		src: img23,
	},
	{
		order: 24,
		title: '365 / 128',
		caption: '📸 128/365⛽',
		year: 2021,
		likes: 431,
		untitled: false,
		alt: 'A gas station at night lit with teal and red light.',
		src: img24,
	},
];

/** Rows still unnamed in the manifest — for the naming hand-off. */
export const untitled = art.filter((piece) => piece.untitled);
