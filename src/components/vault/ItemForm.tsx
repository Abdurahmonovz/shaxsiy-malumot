import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  allowedKinds,
  createItem,
  kindLabels,
  updateSection,
  uploadVaultFile,
  type ItemKind,
  type Section,
} from "@/lib/vault";

const ALL_KINDS: ItemKind[] = ["image", "file", "note", "secret"];

function isKindEnabled(sec: Section, k: ItemKind) {
  if (k === "image") return sec.allow_images;
  if (k === "file") return sec.allow_files;
  if (k === "note") return sec.allow_notes;
  if (k === "secret") return sec.allow_secrets;
  return false;
}

export function ItemForm({ section }: { section: Section }) {
  const kinds = allowedKinds(section);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ItemKind>(kinds[0] ?? "image");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [login, setLogin] = useState("");
  const [secret, setSecret] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  function reset() {
    setTitle("");
    setContent("");
    setLogin("");
    setSecret("");
    setFile(null);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      let newlyEnabled = false;
      const patch: Partial<Section> = {};
      if (kind === "image" && !section.allow_images) { patch.allow_images = true; newlyEnabled = true; }
      if (kind === "file" && !section.allow_files) { patch.allow_files = true; newlyEnabled = true; }
      if (kind === "note" && !section.allow_notes) { patch.allow_notes = true; newlyEnabled = true; }
      if (kind === "secret" && !section.allow_secrets) { patch.allow_secrets = true; newlyEnabled = true; }

      if (Object.keys(patch).length > 0) {
        await updateSection(section.id, patch);
      }

      if (kind === "image" || kind === "file") {
        if (!file) throw new Error("no-file");
        const uploaded = await uploadVaultFile(section.id, file);
        await createItem({
          section_id: section.id,
          kind,
          title: title.trim() || uploaded.name,
          content: content.trim() || null,
          file_path: uploaded.path,
          file_name: uploaded.name,
          file_type: uploaded.type,
          file_size: uploaded.size,
        });
        return { newlyEnabled };
      }
      await createItem({
        section_id: section.id,
        kind,
        title: title.trim(),
        content: content.trim() || null,
        login: kind === "secret" ? login.trim() || null : null,
        secret: kind === "secret" ? secret : null,
      });
      return { newlyEnabled };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      if (data?.newlyEnabled) {
        toast.success(`Bo'limga ${kindLabels[kind].toLowerCase()} funksiyasi qo'shildi va saqlandi`);
      } else {
        toast.success("Ma'lumot saqlandi");
      }
      setOpen(false);
      reset();
    },
    onError: (error: Error) =>
      toast.error(error.message === "no-file" ? "Fayl tanlanmadi" : "Saqlanmadi, qaytadan urinib ko'ring"),
  });

  const canSave =
    kind === "image" || kind === "file"
      ? Boolean(file)
      : kind === "secret"
        ? Boolean(title.trim() && secret)
        : Boolean(title.trim() && content.trim());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 font-semibold">
          <Plus className="mr-2 h-4 w-4" />
          Ma'lumot qo'shish
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{section.name}ga qo'shish</DialogTitle>
          <DialogDescription>Turini tanlab, ma'lumotni kiritib saqlang.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-xs text-muted-foreground">Qo'shiladigan ma'lumot turi:</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_KINDS.map((k) => {
                const isEnabled = isKindEnabled(section, k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      kind === k
                        ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30"
                        : isEnabled
                          ? "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
                          : "border-dashed border-border bg-muted/40 text-muted-foreground/80 hover:border-primary/50"
                    }`}
                  >
                    {!isEnabled ? `+ ${kindLabels[k]}` : kindLabels[k]}
                  </button>
                );
              })}
            </div>
          </div>

          {!isKindEnabled(section, kind) && (
            <p className="rounded-xl border border-primary/25 bg-primary/10 p-3 text-xs leading-relaxed text-primary">
              💡 Ushbu bo'limda <strong>{kindLabels[kind].toLowerCase()}</strong> qo'shish tanlanmagan edi. Saqlaganingizda bu bo'limga <strong>{kindLabels[kind].toLowerCase()}</strong> funksiyasi ham avtomatik qo'shiladi va yoqiladi.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="item-title">Nomi</Label>
            <Input
              id="item-title"
              placeholder={kind === "secret" ? "Bank kabineti paroli" : "Diplom nusxasi"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {kind === "image" || kind === "file" ? (
            <div className="space-y-2">
              <Label htmlFor="item-file">{kind === "image" ? "Rasm tanlang" : "Fayl tanlang"}</Label>
              <Input
                id="item-file"
                type="file"
                accept={kind === "image" ? "image/*" : undefined}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Textarea
                placeholder="Izoh yoki fayl kodi (ixtiyoriy)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
              />
            </div>
          ) : null}

          {kind === "note" ? (
            <div className="space-y-2">
              <Label htmlFor="item-note">Matn</Label>
              <Textarea
                id="item-note"
                placeholder="Kerakli ma'lumotni yozing..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
              />
            </div>
          ) : null}

          {kind === "secret" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="item-login">Login / foydalanuvchi (ixtiyoriy)</Label>
                <Input id="item-login" value={login} onChange={(e) => setLogin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-secret">Parol yoki kod</Label>
                <Input id="item-secret" value={secret} onChange={(e) => setSecret(e.target.value)} />
              </div>
              <Textarea
                placeholder="Qo'shimcha izoh (ixtiyoriy)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSave || mutation.isPending}
            className="w-full font-semibold"
          >
            {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
