import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Download, Eye, EyeOff, FileText, Image as ImageIcon, KeyRound, Pencil, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteItem, formatSize, kindLabels, signedUrl, type Item } from "@/lib/vault";
import { ItemEditDialog } from "./ItemEditDialog";

const icons = {
  image: ImageIcon,
  file: FileText,
  note: StickyNote,
  secret: KeyRound,
};

export function ItemCard({ item, sectionName }: { item: Item; sectionName?: string }) {
  const Icon = icons[item.kind] ?? FileText;
  const [preview, setPreview] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    if (item.kind === "image" && item.file_path) {
      signedUrl(item.file_path)
        .then((url) => {
          if (active) setPreview(url);
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [item.kind, item.file_path]);

  const removal = useMutation({
    mutationFn: () => deleteItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("O'chirildi");
    },
    onError: () => toast.error("O'chirilmadi"),
  });

  async function handleDownload() {
    if (!item.file_path) return;
    try {
      const url = await signedUrl(item.file_path, true);
      window.open(url, "_blank");
    } catch {
      toast.error("Fayl ochilmadi");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Nusxa olindi");
    } catch {
      toast.error("Nusxa olinmadi");
    }
  }

  return (
    <article className="panel overflow-hidden">
      {item.kind === "image" && preview ? (
        <img src={preview} alt={item.title} className="h-44 w-full object-cover" loading="lazy" />
      ) : null}

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span>{kindLabels[item.kind]}</span>
              {sectionName ? <span>· {sectionName}</span> : null}
            </div>
            <h3 className="mt-1 truncate text-base font-semibold">{item.title}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditOpen(true)}
              aria-label="Tahrirlash"
              className="text-muted-foreground hover:text-foreground"
              title="Tahrirlash"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removal.mutate()}
              disabled={removal.isPending}
              aria-label="O'chirish"
              className="text-muted-foreground hover:text-destructive"
              title="O'chirish"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {item.kind === "note" && item.content ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.content}</p>
        ) : null}

        {item.kind === "secret" ? (
          <div className="space-y-2 rounded-xl border border-border bg-surface/60 p-3">
            {item.login ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{item.login}</span>
                <Button variant="ghost" size="icon" aria-label="Loginni nusxalash" onClick={() => copy(item.login!)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-mono">{revealed ? item.secret : "••••••••••"}</span>
              <span className="flex shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={revealed ? "Yashirish" : "Ko'rsatish"}
                  onClick={() => setRevealed((v) => !v)}
                >
                  {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" aria-label="Parolni nusxalash" onClick={() => copy(item.secret ?? "")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </span>
            </div>
            {item.content ? <p className="text-xs text-muted-foreground">{item.content}</p> : null}
          </div>
        ) : null}

        {(item.kind === "file" || item.kind === "image") && item.file_path ? (
          <div className="space-y-2">
            {item.content ? <p className="text-sm text-muted-foreground">{item.content}</p> : null}
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-muted-foreground">
                {item.file_name} {formatSize(item.file_size) ? `· ${formatSize(item.file_size)}` : ""}
              </span>
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Yuklab olish
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <ItemEditDialog item={item} open={editOpen} onOpenChange={setEditOpen} />
    </article>
  );
}
