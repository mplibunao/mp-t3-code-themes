import { kebab, type CssContext } from "./context.ts";

export const properties = ({
  sprites,
}: CssContext): string => `/* Save Point: a 16-bit rest site. The scene is still while nothing runs, wakes when the
   composer has focus, and comes alive while the agent works. */
.dark {
${Object.entries(sprites)
  .map(([key, sprite]) => `  --sp-${kebab(key)}: ${sprite.uri};`)
  .join("\n")}
}
@property --sp-kx {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}
@property --sp-mx {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}

`;
