import { CONV, CONV_WORKING, img, type CssContext } from "./context.ts";

export const sky = ({
  sprites,
}: CssContext): string => `/* The sky while a run lasts: a shooting star as it starts, then a dragon crossing, on a loop.
   The path animates only transform and opacity, so it can run off the main thread. */
${CONV}::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: ${sprites.comet.w * 4}px;
  height: ${sprites.comet.h * 4}px;
  pointer-events: none;
  --sp-w: 0;
  background:
    var(--sp-sa, none) 0 0 / calc(100% * (1 - var(--sp-w))) 100% no-repeat,
    var(--sp-sb, none) 0 0 / calc(100% * var(--sp-w)) 100% no-repeat;
  opacity: 0;
}
${CONV_WORKING}::after {
  animation:
    sp-sky 48s linear infinite,
    sp-sky-cast 48s step-end infinite,
    sp-flap 0.7s step-end infinite;
}
@keyframes sp-sky {
  0% { opacity: 0; transform: translate(62vw, 36px); }
  0.4% { opacity: 1; }
  2.4% { opacity: 1; }
  3% { opacity: 0; transform: translate(calc(62vw - 480px), 276px); }
  40% { opacity: 0; transform: translate(-70px, 120px); animation-timing-function: steps(260, end); }
  41% { opacity: 1; }
  79% { opacity: 1; }
  80%, 100% { opacity: 0; transform: translate(100vw, 64px); }
}
@keyframes sp-sky-cast {
  0% { --sp-sa: ${img("comet")}; --sp-sb: ${img("comet")}; }
  20% { --sp-sa: ${img("dragonUp")}; --sp-sb: ${img("dragonDown")}; }
}
@keyframes sp-flap {
  0% { --sp-w: 0; }
  50% { --sp-w: 1; }
}

`;
