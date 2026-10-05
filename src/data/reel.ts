/*
 * The reel. Everything the page needs lives here, so when the cut is done
 * this is the only file to touch.
 *
 *  1. Export the reel (16:9, H.264 MP4, ~1080p, under ~25 MB) and drop it in
 *     public/reel/reel.mp4. Or host on Vimeo and set `vimeoId` instead.
 *  2. Drop a poster frame at src/assets/home/reel-poster.jpg (jpg, png or webp);
 *     it is picked up automatically and printed by Darkroom.
 *  3. Set `ready: true`. The placeholder frame becomes the player.
 *
 * Behavior once ready: poster + play button, click plays with sound,
 * nothing loads until clicked.
 */
export const reel = {
	ready: false,
	title: 'Colton Batts — Reel 2026',
	duration: '0:00', // e.g. '1:12'
	mp4: '/reel/reel.mp4' as string | null,
	vimeoId: null as string | null, // if set, wins over mp4
};
