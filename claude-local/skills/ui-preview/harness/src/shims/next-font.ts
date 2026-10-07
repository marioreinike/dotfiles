// Stand-in for `next/font/google` and `next/font/local`. Fonts come from the
// Google Fonts <link> in index.html; this only returns the expected shape.
// Add a named export here when a component imports another font.
const font =
  (family: string) =>
  (_opts?: unknown): { className: string; variable: string; style: { fontFamily: string } } => ({
    className: "",
    variable: "",
    style: { fontFamily: `'${family}', sans-serif` },
  });

export const Plus_Jakarta_Sans = font("Plus Jakarta Sans");
export const Inter = font("Inter");
export default font("sans-serif");
