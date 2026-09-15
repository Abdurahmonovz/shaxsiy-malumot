import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FolderOpen, Search, Trash2 } from "lucide-react";
import { useVaultSession } from "@/hooks/useVaultSession";
import { LockScreen } from "@/components/vault/LockScreen";
import { ItemForm } from "@/components/vault/ItemForm";
import { ItemCard } from "@/components/vault/ItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allowedKinds, deleteSection, fetchItems, fetchSections, kindLabels, updateSection } from "@/lib/vault";

export const Route = createFileRoute("/section/$sectionId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bo'lim ma'lumotlari — Shaxsiy seyf" },
      {
        name: "description",
        content: "Bo'limdagi rasm, fayl, matn va parollarni ko'rish, qidirish va yangi ma'lumot qo'shish.",
      },
      { property: "og:title", content: "Bo'lim ma'lumotlari — Shaxsiy seyf" },
      {
        property: "og:description",
        content: "Bo'limdagi barcha hujjat, rasm, fayl va parollar bir joyda, tartibli ko'rinishda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SectionPage,
});

function SectionPage() {
  const { session, loading } = useVaultSession();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      </main>
    );
  }
  if (!session) return <LockScreen />;
  return <SectionDetail />;
}

function SectionDetail() {
  const { sectionId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");

  const sections = useQuery({ queryKey: ["sections"], queryFn: fetchSections });
  const items = useQuery({ queryKey: ["items"], queryFn: () => fetchItems() });

  const section = (sections.data ?? []).find((s) => s.id === sectionId);
  const term = query.trim().toLowerCase();

  const sectionItems = useMemo(() => {
    const list = (items.data ?? []).filter((i) => i.section_id === sectionId);
    if (!term) return list;
    return list.filter((i) =>
      `${i.title} ${i.content ?? ""} ${i.login ?? ""} ${i.file_name ?? ""}`.toLowerCase().includes(term),
    );
  }, [items.data, sectionId, term]);

  const toggleKindMutation = useMutation({
    mutationFn: (patch: Partial<Parameters<typeof updateSection>[1]>) => updateSection(sectionId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast.success("Bo'lim funksiyasi yoqildi");
    },
    onError: () => toast.error("Funksiyani yoqib bo'lmadi"),
  });

  const removal = useMutation({
    mutationFn: () => deleteSection(sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Bo'lim o'chirildi");
      navigate({ to: "/" });
    },
    onError: () => toast.error("O'chirilmadi"),
  });

  if (sections.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      </main>
    );
  }

  if (!section) {
    return (
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <FolderOpen className="mx-auto mb-3 h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">Bunday bo'lim topilmadi.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
          Bosh sahifaga qaytish
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Bo'limlar
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{section.name}</h1>
          {section.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {allowedKinds(section).map((kind) => (
              <span
                key={kind}
                className="rounded-full border border-border bg-surface/60 px-2.5 py-1 text-xs text-muted-foreground"
              >
                {kindLabels[kind]}
              </span>
            ))}
            {!section.allow_images && (
              <button
                type="button"
                onClick={() => toggleKindMutation.mutate({ allow_images: true })}
                disabled={toggleKindMutation.isPending}
                className="rounded-full border border-dashed border-primary/50 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                title="Rasm yuklash funksiyasini yoqish"
              >
                + Rasm funksiyasini yoqish
              </button>
            )}
            {!section.allow_files && (
              <button
                type="button"
                onClick={() => toggleKindMutation.mutate({ allow_files: true })}
                disabled={toggleKindMutation.isPending}
                className="rounded-full border border-dashed border-primary/50 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                title="Fayl yuklash funksiyasini yoqish"
              >
                + Fayl funksiyasini yoqish
              </button>
            )}
            {!section.allow_notes && (
              <button
                type="button"
                onClick={() => toggleKindMutation.mutate({ allow_notes: true })}
                disabled={toggleKindMutation.isPending}
                className="rounded-full border border-dashed border-primary/50 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                title="Matn yozish funksiyasini yoqish"
              >
                + Matn funksiyasini yoqish
              </button>
            )}
            {!section.allow_secrets && (
              <button
                type="button"
                onClick={() => toggleKindMutation.mutate({ allow_secrets: true })}
                disabled={toggleKindMutation.isPending}
                className="rounded-full border border-dashed border-primary/50 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                title="Parol saqlash funksiyasini yoqish"
              >
                + Parol funksiyasini yoqish
              </button>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Bo'limni o'chirish"
          onClick={() => removal.mutate()}
          disabled={removal.isPending}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bu bo'lim ichida qidirish..."
            className="h-12 pl-11"
          />
        </div>
        <ItemForm section={section} />
      </div>

      {sectionItems.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {term ? "Hech narsa topilmadi." : "Bu bo'lim bo'sh. Birinchi ma'lumotni qo'shing."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sectionItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
