// Message text scrolls over the landscape, so the landscape has a brightness ceiling. The curve
// leaves the darks alone, about halves the brightest sky, and lands white just under CEILING (a
// relative luminance). At 0.075, secondary text keeps 4.5:1 over the sky and the mountains, and
// message text keeps 6.5:1 over any pixel. The three channels scale together in linear light,
// so hue and saturation hold. Raise CEILING for a brighter scene.
const CEILING = 0.075;
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const linearChannel = (hex: string, start: number) =>
  toLinear(Number.parseInt(hex.slice(start, start + 2), 16) / 255);

/**
 * Creates the tone curve for one build.
 *
 * @returns The curve, which maps `#rrggbb` to `#rrggbb`. Its cache lives as long as it does.
 */
export const createTone = (): ((hex: string) => string) => {
  const toned = new Map<string, string>();
  return (hex: string) => {
    const known = toned.get(hex);
    if (known) {
      return known;
    }
    const rgb = [linearChannel(hex, 1), linearChannel(hex, 3), linearChannel(hex, 5)] as const;
    const light = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    const scale = 1 / (1 + light / CEILING);
    const out = `#${rgb
      .map((c) =>
        Math.round(toSrgb(c * scale) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
    toned.set(hex, out);
    return out;
  };
};
