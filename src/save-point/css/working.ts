import {
  KNIGHT_FIGHT,
  KNIGHT_HOME,
  MEET,
  SPAWN,
  STAGE_WORKING,
  img,
  type CssContext,
} from "./context.ts";
import { ENCOUNTER_SECONDS, MONSTERS, encounterScript } from "./encounters.ts";

export const workingStage = ({
  withBalloon,
}: CssContext): string => `/* Working: the bot hammers, the mage casts, the fire blazes, and the knight goes out to meet
   whatever comes along the edge: a slime, then a bat, then a ghost. */
${STAGE_WORKING} {
  --sp-note: ${img("dots3")};
  --sp-ka: ${img("knightStand")};
  --sp-bot: ${img("botWorkA")};
  --sp-tool: ${img("toolUp")};
  --sp-mage: ${img("mageCastA")};
  --sp-fire: ${img("fireBlazeA")};
  --sp-glow: rgb(247 154 78 / 34%);
  background-position:
    ${withBalloon.position};
  background-size:
    ${withBalloon.size};
  animation:
    sp-fire-blaze 0.54s step-end infinite,
    sp-hammer 0.8s step-end infinite,
    sp-dots 1.8s step-end infinite,
    sp-cast 1s step-end infinite,
    sp-encounter ${ENCOUNTER_SECONDS * MONSTERS.length}s step-end infinite,
    sp-knight-path ${ENCOUNTER_SECONDS}s linear infinite,
    sp-monster-path ${ENCOUNTER_SECONDS}s linear infinite,
    sp-tick 0.5s step-end infinite;
}
`;

export const workingKeyframes = (): string => `@keyframes sp-fire-blaze {
  0% { --sp-fire: ${img("fireBlazeA")}; }
  33% { --sp-fire: ${img("fireBlazeB")}; }
  66% { --sp-fire: ${img("fireBlazeC")}; }
}
@keyframes sp-hammer {
  0% { --sp-tool: ${img("toolUp")}; --sp-bot: ${img("botWorkA")}; }
  62% { --sp-tool: ${img("toolHit")}; --sp-bot: ${img("botWorkB")}; }
}
@keyframes sp-dots {
  0% { --sp-note: ${img("dots1")}; }
  33% { --sp-note: ${img("dots2")}; }
  66% { --sp-note: ${img("dots3")}; }
}
@keyframes sp-cast {
  0% { --sp-mage: ${img("mageCastA")}; }
  50% { --sp-mage: ${img("mageCastB")}; }
}
@keyframes sp-encounter {
${encounterScript()}
}
@keyframes sp-tick {
  0% { --sp-t: 0; }
  50% { --sp-t: 1; }
}
`;

export const movement =
  (): string => `/* Movement is stepped, a few pixels at a time, so the stage repaints only on a step. */
@keyframes sp-knight-path {
  0%, 4% { --sp-kx: ${KNIGHT_HOME}; animation-timing-function: steps(48, end); }
  30%, 62% { --sp-kx: ${KNIGHT_FIGHT}; animation-timing-function: steps(48, end); }
  92%, 100% { --sp-kx: ${KNIGHT_HOME}; }
}
@keyframes sp-monster-path {
  0%, 8% { --sp-mx: ${SPAWN}; animation-timing-function: steps(22, end); }
  30%, 100% { --sp-mx: ${MEET}; }
}
/* A card too narrow for an encounter keeps the camp at work and the knight at home. */
@container composer-surface (max-width: 30rem) {
  ${STAGE_WORKING} {
    animation:
      sp-fire-blaze 0.54s step-end infinite,
      sp-hammer 0.8s step-end infinite,
      sp-dots 1.8s step-end infinite,
      sp-cast 1s step-end infinite;
  }
}

`;
