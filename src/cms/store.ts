import "server-only";
import { readDocument, writeDocument } from "./persistence";
export { dataDir, atomicWrite } from "./paths";
import defaults from "./defaults.json";

export type Content = typeof defaults;
export type Revision = { id: string; date: string; content: Content };
export type State = {
  version: number;
  draft: Content;
  published: Content;
  updatedAt: string | null;
  publishedAt: string | null;
  history: Revision[];
};
export async function readState(): Promise<State> {
  const saved = await readDocument<State>("content");
  if (!saved)
    return {
      version: 0,
      draft: structuredClone(defaults),
      published: structuredClone(defaults),
      updatedAt: null,
      publishedAt: null,
      history: [],
    };
  const hydrate = (content: Content): Content => {
    const result = { ...structuredClone(defaults), ...content };
    for (const key of Object.keys(defaults) as Array<keyof Content>) {
      if (!key.startsWith("data-") && key !== "home" && key !== "customPages")
        (result as unknown as Record<string, unknown>)[key] = {
          ...defaults[key],
          ...content[key],
        };
    }
    return result;
  };
  return {
    ...saved,
    draft: hydrate(saved.draft),
    published: hydrate(saved.published),
    history: saved.history.map((revision) => ({
      ...revision,
      content: hydrate(revision.content),
    })),
  };
}
export async function saveState(state: State) {
  await writeDocument("content", state, state.version - 1);
}
