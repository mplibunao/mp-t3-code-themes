import { CONV, STAGE, WAITING, img } from "./context.ts";

export const chrome =
  (): string => `/* Windows: the user's lines and the composer read as RPG dialogue boxes. */
.dark [data-user-message-bubble] {
  border-radius: 6px;
  box-shadow:
    inset 0 0 0 1px #6a62b4,
    inset 0 0 0 2px #1b1838,
    0 2px 0 0 #0b0a14;
}
.dark [data-slot="composer-host"] {
  --chat-composer-outline: #4a437f;
}
.dark [data-slot="composer-host"]:focus-within {
  --chat-composer-outline: #b08a55;
}

/* A menu cursor on the open thread. */
.dark [data-thread-item] {
  position: relative;
}
.dark [data-thread-item]:has([aria-current]:not([aria-current="false"]))::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 1px;
  z-index: 3;
  width: 6px;
  height: 10px;
  margin-top: -5px;
  pointer-events: none;
  background: ${img("cursor")} center / 100% 100% no-repeat;
}

.dark [data-slot="scroll-area-thumb"] {
  border-radius: 0;
  background-color: #4a437f;
}
.dark ::selection {
  background-color: rgb(240 183 101 / 30%);
}

@media (prefers-reduced-motion: reduce) {
  ${CONV}::before,
  ${CONV}::after,
  ${STAGE},
  ${WAITING}::before {
    animation: none !important;
  }
}
`;
