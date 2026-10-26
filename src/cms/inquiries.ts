import "server-only";
import { randomUUID } from "node:crypto";
import {
  listDocuments,
  writeDocument,
  patchDocument,
  removeDocument,
} from "./persistence";
export type Inquiry = {
  id: string;
  createdAt: string;
  read: boolean;
  kind: "contact" | "quote" | "inquiry";
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  items: { name: string; qty: number; href: string }[];
  delivery: "not_configured" | "sent" | "failed";
  consent: true;
};
export async function receiveInquiry(
  values: Omit<Inquiry, "id" | "createdAt" | "read" | "delivery">,
) {
  const item: Inquiry = {
    ...values,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    read: false,
    delivery: "not_configured",
  };
  await writeDocument("inquiry:" + item.id, item);
  return item;
}
export async function inquiries() {
  return (await listDocuments<Inquiry>("inquiry:")).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}
export const updateInquiry = (id: string, patch: Record<string, unknown>) =>
  patchDocument("inquiry:" + id, patch);
export const deleteInquiry = (id: string) => removeDocument("inquiry:" + id);
