export function textId(text: string) {
  let hash = BigInt("14695981039346656037");
  for (const char of text) {
    hash ^= BigInt(char.codePointAt(0)!);
    hash = BigInt.asUintN(64, hash * BigInt("1099511628211"));
  }
  return "t-" + hash.toString(36);
}
