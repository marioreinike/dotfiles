// Stand-in for `next/script`: third-party scripts are never loaded in previews.
export default function Script(_props: Record<string, unknown>) {
  return null;
}
