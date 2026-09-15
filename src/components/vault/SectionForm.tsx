import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderPlus } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { createSection } from "@/lib/vault";

const kindOptions = [
  { key: "allow_images", label: "Rasmlar", hint: "Hujjat suratlari, skrinshotlar" },
  { key: "allow_files", label: "Fayllar", hint: "PDF, Word, .pfx va boshqalar" },
  { key: "allow_notes", label: "Matnli eslatmalar", hint: "Erkin yozuvlar" },
  { key: "allow_secrets", label: "Parollar va kodlar", hint: "Yashirin holda saqlanadi" },
] as const;

export function SectionForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [flags, setFlags] = useState({
    allow_images: true,
    allow_files: true,
    allow_notes: true,
    allow_secrets: true,
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createSection({ name: name.trim(), description: description.trim(), ...flags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast.success("Bo'lim yaratildi");
      setOpen(false);
      setName("");
      setDescription("");
      setFlags({ allow_images: true, allow_files: true, allow_notes: true, allow_secrets: true });
    },
    onError: () => toast.error("Bo'lim yaratilmadi, qaytadan urinib ko'ring"),
  });

  const anyKind = Object.values(flags).some(Boolean);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 font-semibold">
          <FolderPlus className="mr-2 h-4 w-4" />
          Yangi bo'lim
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi bo'lim</DialogTitle>
          <DialogDescription>
            Bo'lim nomini yozing va ichida nimalar saqlanishini belgilang.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="section-name">Bo'lim nomi</Label>
            <Input
              id="section-name"
              placeholder="Universitet hujjatlari"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section-desc">Qisqa izoh (ixtiyoriy)</Label>
            <Textarea
              id="section-desc"
              placeholder="Diplom, kontrakt, ID raqamlar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Bu bo'limda nimalar bo'ladi?</Label>
            {kindOptions.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface/60 p-3"
              >
                <Checkbox
                  checked={flags[option.key]}
                  onCheckedChange={(checked) =>
                    setFlags((prev) => ({ ...prev, [option.key]: checked === true }))
                  }
                />
                <span>
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || !anyKind || mutation.isPending}
            className="w-full font-semibold"
          >
            {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
