import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Image as ImageIcon, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateItem, uploadVaultFile, type Item } from "@/lib/vault";

interface ItemEditDialogProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemEditDialog({ item, open, onOpenChange }: ItemEditDialogProps) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content ?? "");
  const [login, setLogin] = useState(item.login ?? "");
  const [secret, setSecret] = useState(item.secret ?? "");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  function handleFileChange(selected: File | null) {
    if (!selected) return;
    setNewFile(selected);
    if (selected.type.startsWith("image/")) {
      const url = URL.createObjectURL(selected);
      setPreview(url);
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      let filePath = item.file_path;
      let fileName = item.file_name;
      let fileType = item.file_type;
      let fileSize = item.file_size;

      if (newFile) {
        const uploaded = await uploadVaultFile(item.section_id, newFile);
        filePath = uploaded.path;
        fileName = uploaded.name;
        fileType = uploaded.type;
        fileSize = uploaded.size;
      }

      await updateItem(item.id, {
        title: title.trim() || item.title,
        content: content.trim() || null,
        login: item.kind === "secret" ? login.trim() || null : null,
        secret: item.kind === "secret" ? secret : null,
        file_path: filePath,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("O'zgarishlar muvaffaqiyatli saqlandi");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Tahrirlashda xatolik yuz berdi");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ma'lumotni tahrirlash</DialogTitle>
          <DialogDescription>
            Kerakli o'zgarishlarni kiriting va saqlang.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Nomi</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nomi..."
            />
          </div>

          {item.kind === "secret" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="edit-login">Login / Foydalanuvchi</Label>
                <Input
                  id="edit-login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="masalan: +99890... yoki email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-secret">Parol yoki Kod</Label>
                <Input
                  id="edit-secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Yangi parol yoki kod"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-secret-content">Qo'shimcha izoh (ixtiyoriy)</Label>
                <Textarea
                  id="edit-secret-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Izoh..."
                  rows={2}
                />
              </div>
            </div>
          ) : null}

          {item.kind === "note" ? (
            <div className="space-y-2">
              <Label htmlFor="edit-note">Matn mazmuni</Label>
              <Textarea
                id="edit-note"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Matn..."
                rows={6}
              />
            </div>
          ) : null}

          {item.kind === "image" ? (
            <div className="space-y-3">
              <Label>Rasmni almashtirish (ixtiyoriy)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 text-xs font-medium"
                >
                  <Camera className="mr-1.5 h-4 w-4 text-primary" />
                  Kameradan tushirish
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 text-xs font-medium"
                >
                  <ImageIcon className="mr-1.5 h-4 w-4 text-muted-foreground" />
                  Galereyadan tanlash
                </Button>
              </div>

              {/* Hidden inputs for camera and gallery */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />

              {preview ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <img src={preview} alt="Yangi rasm" className="max-h-48 w-full object-cover" />
                  <p className="p-2 text-center text-xs text-primary font-medium">Yangi rasm tanlandi ✓</p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="edit-img-desc">Izoh (ixtiyoriy)</Label>
                <Textarea
                  id="edit-img-desc"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Rasm haqida izoh..."
                  rows={2}
                />
              </div>
            </div>
          ) : null}

          {item.kind === "file" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="edit-file-desc">Izoh (ixtiyoriy)</Label>
                <Textarea
                  id="edit-file-desc"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Fayl haqida izoh..."
                  rows={2}
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Bekor qilish
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
            className="font-semibold"
          >
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Saqlanmoqda..." : "O'zgarishlarni saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
