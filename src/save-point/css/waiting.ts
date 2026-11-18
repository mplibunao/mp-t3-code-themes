import { CARD, WAITING, img, stage, type CssContext } from "./context.ts";

export const waiting = ({
  sprites,
  withBalloon,
}: CssContext): string => `/* Waiting on you: the camp stands on the open drawer, awake, and the balloon bounces a "!". */
${WAITING} ${CARD}::before {
  display: none;
}
${WAITING}::before {
  right: 22px;
  left: 22px;
  --sp-note: ${img("bang")};
  --sp-ka: ${img("knightStand")};
  --sp-bot: ${img("botAwake")};
  --sp-mage: ${img("mageIdle")};
  --sp-fire: ${img("fireLowA")};
  --sp-glow: rgb(247 154 78 / 22%);
  background-position:
    ${withBalloon.position};
  background-size:
    ${withBalloon.size};
  animation:
    sp-fire-low 0.9s step-end infinite,
    sp-bang 1s step-end infinite;
}
@keyframes sp-bang {
  0% { background-position: ${withBalloon.position.replace(/\s+/g, " ")}; }
  50% { background-position: ${stage(sprites, sprites.bang, 1).position.replace(/\s+/g, " ")}; }
}

`;
