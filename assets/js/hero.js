/**
 * Hero background video.
 *
 * The video plays unconditionally — every viewport size, and regardless of
 * prefers-reduced-motion. That is a deliberate product decision: the hero is
 * meant to be a moving background, not a still. Note the consequence: visitors
 * who have asked their OS for reduced motion (on Windows that is
 * Settings → Accessibility → Visual effects → Animation effects = Off) will
 * still get motion here. To hand them the poster instead, bail out early on
 * `matchMedia('(prefers-reduced-motion: reduce)').matches`.
 *
 * src/autoplay are in the markup, so this module is only responsible for the
 * two things HTML cannot express:
 *   1. pausing while the hero is off-screen, so the page is not decoding 30fps
 *      of 1080p while the visitor is down in the map explorer;
 *   2. recovering when the browser refuses to autoplay — iOS Low Power Mode
 *      blocks video autoplay outright, even muted, which would otherwise leave
 *      a permanently frozen poster.
 *
 * assets/predios-overview.mp4 must stay faststart (moov atom at the front) or
 * the browser has to download the whole file before showing a single frame:
 *   ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4
 */

export function initHero() {
  const video = document.getElementById('hero-video');
  if (!video) return;

  let onScreen = true;

  const tryPlay = () => {
    if (!onScreen) return Promise.resolve();
    const p = video.play();
    return p && typeof p.catch === 'function' ? p.catch(() => {}) : Promise.resolve();
  };

  // If autoplay was refused, the first interaction of any kind is a user
  // gesture and will be accepted.
  const events = ['pointerdown', 'touchstart', 'keydown', 'scroll'];
  const retryOnInteraction = () => {
    if (!video.paused) return unbind();
    tryPlay().then(() => {
      if (!video.paused) unbind();
    });
  };
  const unbind = () => {
    for (const e of events) window.removeEventListener(e, retryOnInteraction);
  };
  for (const e of events) {
    window.addEventListener(e, retryOnInteraction, { passive: true });
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) tryPlay();
      else video.pause();
    },
    { threshold: 0.1 }
  );
  observer.observe(video);

  tryPlay();
}
