import {
  KNIGHT_HOME,
  SPAWN,
  STAGE,
  STAGE_H,
  STAGE_READY,
  WAITING,
  img,
  px,
  type CssContext,
} from "./context.ts";

export const restingStage = ({
  atRest,
}: CssContext): string => `/* The stage on the composer's edge. At rest the camp sleeps: lantern-bot, knight and mage by
   the embers. */
${STAGE},
${WAITING}::before {
  content: "";
  position: absolute;
  right: 0;
  bottom: 100%;
  left: 0;
  z-index: 2;
  height: ${px(STAGE_H)};
  pointer-events: none;
  --sp-note: ${img("zzz")};
  --sp-t: 0;
  --sp-fa: none;
  --sp-fb: none;
  --sp-ma: none;
  --sp-mb: none;
  --sp-ka: ${img("knightSleep")};
  --sp-kb: none;
  --sp-bot: ${img("botSleep")};
  --sp-tool: ${img("toolRest")};
  --sp-mage: ${img("mageSleep")};
  --sp-fire: ${img("fireEmber")};
  --sp-glow: rgb(247 154 78 / 10%);
  --sp-kx: ${KNIGHT_HOME};
  --sp-mx: ${SPAWN};
  background-image:
    ${atRest.image};
  background-repeat: no-repeat;
  background-position:
    ${atRest.position};
  background-size:
    ${atRest.size};
}

`;

export const readyStage = (): string => `/* Ready: the composer has focus. */
${STAGE_READY} {
  --sp-note: none;
  --sp-ka: ${img("knightStand")};
  --sp-bot: ${img("botAwake")};
  --sp-mage: ${img("mageIdle")};
  --sp-fire: ${img("fireLowA")};
  --sp-glow: rgb(247 154 78 / 22%);
  animation:
    sp-fire-low 0.9s step-end infinite,
    sp-blink 5.2s step-end infinite;
}
@keyframes sp-fire-low {
  0% { --sp-fire: ${img("fireLowA")}; }
  50% { --sp-fire: ${img("fireLowB")}; }
}
@keyframes sp-blink {
  0%, 100% { --sp-bot: ${img("botAwake")}; }
  94% { --sp-bot: ${img("botBlink")}; }
}

`;
