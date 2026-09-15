import { supabase } from "@/integrations/supabase/client";

/**
 * Single-owner vault: the app is unlocked with the owner's birth date, which is
 * used as the password of one fixed account. All data is protected by
 * row-level security on the backend.
 */
const OWNER_EMAIL = "owner@shaxsiy-seyf.app";

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

export function normalizeDate(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return null;
  return `${day}.${month}.${year}`;
}

/** Unlock (or, the very first time, create) the vault with a birth date. */
export async function unlockWithDate(date: string) {
  const password = `vault-${date}`;
  const first = await supabase.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password,
  });
  if (!first.error) return { ok: true as const };

  const signUp = await supabase.auth.signUp({ email: OWNER_EMAIL, password });
  if (signUp.error) {
    return { ok: false as const, message: "Sana to'g'ri kelmadi. Qaytadan urinib ko'ring." };
  }
  if (!signUp.data.session) {
    const retry = await supabase.auth.signInWithPassword({ email: OWNER_EMAIL, password });
    if (retry.error) {
      return { ok: false as const, message: "Kirish amalga oshmadi. Qaytadan urinib ko'ring." };
    }
  }
  return { ok: true as const };
}

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

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function createSection(input: {
  name: string;
  description: string;
  allow_images: boolean;
  allow_files: boolean;
  allow_notes: boolean;
  allow_secrets: boolean;
}) {
  const userId = await currentUserId();
  if (!userId) throw new Error("Avval kiring");
  const { error } = await supabase.from("sections").insert({ ...input, user_id: userId });
  if (error) throw error;
}

export async function deleteSection(id: string) {
  const { error } = await supabase.from("sections").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadVaultFile(sectionId: string, file: File) {
  const userId = await currentUserId();
  if (!userId) throw new Error("Avval kiring");
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${userId}/${sectionId}/${crypto.randomUUID()}-${safeName}`;
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
  const userId = await currentUserId();
  if (!userId) throw new Error("Avval kiring");
  const { error } = await supabase.from("items").insert({ ...input, user_id: userId });
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
  const { data, error } = await supabase.storage
    .from("vault")
    .createSignedUrl(path, 60 * 60, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
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
