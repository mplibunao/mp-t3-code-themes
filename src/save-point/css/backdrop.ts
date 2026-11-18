import { CONV, CONV_WORKING, img, px, size, type CssContext } from "./context.ts";

export const backdrop = ({
  sprites,
  landscape,
}: CssContext): string => `/* Backdrop. image-rendering inherits, so the chat's own images are reset below. */
${CONV} {
  isolation: isolate;
  image-rendering: pixelated;
  background-color: ${landscape.background};
  background-image:
    radial-gradient(closest-side, rgb(190 180 240 / 7%), transparent),
    ${img("moon")},
    ${img("moonSmall")},
    var(--theme-background-image, none);
  background-repeat: no-repeat, no-repeat, no-repeat, repeat-x;
  /* The moons hang off the bottom edge, like the range, so they always clear the peaks. They sit
     to the right, under the thread details card's column. */
  background-position:
    right 13px bottom 448px,
    right 70px bottom 505px,
    right 178px bottom 476px,
    center bottom;
  background-size: 180px 180px, ${size(sprites.moon)}, ${size(sprites.moonSmall)}, ${px(landscape.width)} ${px(landscape.height)};
}
${CONV} > * {
  image-rendering: auto;
}
/* A new or loading thread fills the area with an opaque placeholder, which would hide the scene. */
${CONV} [data-timeline-loading] {
  background-color: transparent;
}
/* The strip under the composer is glass that hides text scrolling behind it. With an empty
   timeline there is nothing to hide, and the glass would show as a slab over the mountains. */
${CONV}:has([data-timeline-loading]) ~ * [data-slot="composer-context-strip"] {
  background: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

/* A few stars that twinkle only while something is happening. */
${CONV}::before {
  content: "";
  position: absolute;
  inset: 0 0 ${px(150)} 0;
  z-index: -1;
  pointer-events: none;
  background:
    ${img("starsA")} 0 0 / ${size(sprites.starsA)} repeat,
    ${img("starsB")} 60px 30px / ${size(sprites.starsB)} repeat;
  opacity: 0.4;
}
${CONV}:has(~ * [data-chat-composer-form]:focus-within)::before {
  animation: sp-twinkle 3.2s steps(1, end) infinite;
}
${CONV_WORKING}::before {
  animation: sp-twinkle 1.6s steps(1, end) infinite;
}
@keyframes sp-twinkle {
  0% { opacity: 0.4; }
  25% { opacity: 0.7; }
  50% { opacity: 0.2; }
  75% { opacity: 0.55; }
}

`;
