import { supabase } from "@/integrations/supabase/client";

export type ItemKind = "image" | "file" | "note" | "secret";

export type Section = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  allow_images: boolean;
  allow_files: boolean;
  allow_notes: boolean;
  allow_secrets: boolean;
  created_at: string;
};

export type Item = {
  id: string;
  section_id: string;
  kind: ItemKind;
  title: string;
  content: string | null;
  login: string | null;
  secret: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
};

export const kindLabels: Record<ItemKind, string> = {
  image: "Rasm",
  file: "Fayl",
  note: "Matn",
  secret: "Parol / kod",
};

export async function fetchSections() {
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Section[];
}

export async function fetchItems(sectionId?: string) {
  let query = supabase.from("items").select("*").order("created_at", { ascending: false });
  if (sectionId) query = query.eq("section_id", sectionId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Item[];
}

export async function createSection(input: {
  name: string;
  description: string;
  allow_images: boolean;
  allow_files: boolean;
  allow_notes: boolean;
  allow_secrets: boolean;
}) {
  const { error } = await supabase.from("sections").insert([input]);
  if (error) throw error;
}

export async function deleteSection(id: string) {
  const { error } = await supabase.from("sections").delete().eq("id", id);
  if (error) throw error;
}

export async function updateSection(
  id: string,
  patch: Partial<Omit<Section, "id" | "created_at">>
) {
  const { error } = await supabase.from("sections").update(patch).eq("id", id);
  if (error) throw error;
}

export async function uploadVaultFile(sectionId: string, file: File) {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${sectionId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("vault").upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  return { path, name: file.name, type: file.type, size: file.size };
}

export async function createItem(input: {
  section_id: string;
  kind: ItemKind;
  title: string;
  content?: string | null;
  login?: string | null;
  secret?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
}) {
  const { error } = await supabase.from("items").insert([input]);
  if (error) throw error;
}

export async function updateItem(
  id: string,
  patch: Partial<Omit<Item, "id" | "created_at" | "user_id">>
) {
  const { error } = await supabase.from("items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteItem(item: Item) {
  if (item.file_path) {
    await supabase.storage.from("vault").remove([item.file_path]);
  }
  const { error } = await supabase.from("items").delete().eq("id", item.id);
  if (error) throw error;
}

export async function signedUrl(path: string, download = false) {
  try {
    const { data, error } = await supabase.storage
      .from("vault")
      .createSignedUrl(path, 60 * 60, download ? { download: true } : undefined);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch (_) {}

  const { data } = supabase.storage.from("vault").getPublicUrl(path, download ? { download: true } : undefined);
  return data.publicUrl;
}

export function formatSize(bytes: number | null) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function allowedKinds(section: Section): ItemKind[] {
  const kinds: ItemKind[] = [];
  if (section.allow_images) kinds.push("image");
  if (section.allow_files) kinds.push("file");
  if (section.allow_notes) kinds.push("note");
  if (section.allow_secrets) kinds.push("secret");
  return kinds;
}
