import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVaultSession } from "@/hooks/useVaultSession";
import { LockScreen } from "@/components/vault/LockScreen";
import { SectionForm } from "@/components/vault/SectionForm";
import { ItemCard } from "@/components/vault/ItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allowedKinds, fetchItems, fetchSections, kindLabels } from "@/lib/vault";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Shaxsiy seyf — hujjat, rasm va parollar saqlagichi" },
      {
        name: "description",
        content:
          "Bo'limlar yaratib hujjat, rasm, fayl va parollaringizni tartibli saqlang va bir qidiruv bilan toping.",
      },
      { property: "og:title", content: "Shaxsiy seyf — barcha ma'lumotlaringiz bir joyda" },
      {
        property: "og:description",
        content: "Universitet hujjatlari, korxona fayllari, kodlar va parollar uchun xavfsiz shaxsiy saqlagich.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { session, loading } = useVaultSession();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      </main>
    );
  }

  if (!session) return <LockScreen />;
  return <Dashboard />;
}

function Dashboard() {
  const [query, setQuery] = useState("");
  const sections = useQuery({ queryKey: ["sections"], queryFn: fetchSections });
  const items = useQuery({ queryKey: ["items"], queryFn: () => fetchItems() });

  const sectionNames = useMemo(() => {
    const map = new Map<string, string>();
    (sections.data ?? []).forEach((s) => map.set(s.id, s.name));
    return map;
  }, [sections.data]);

  const term = query.trim().toLowerCase();

  const matchedSections = useMemo(
    () =>
      (sections.data ?? []).filter((s) =>
        !term
          ? true
          : `${s.name} ${s.description ?? ""}`.toLowerCase().includes(term),
      ),
    [sections.data, term],
  );

  const matchedItems = useMemo(() => {
    if (!term) return [];
    return (items.data ?? []).filter((i) =>
      `${i.title} ${i.content ?? ""} ${i.login ?? ""} ${i.file_name ?? ""} ${
        sectionNames.get(i.section_id) ?? ""
      }`
        .toLowerCase()
        .includes(term),
    );
  }, [items.data, term, sectionNames]);

  const countBySection = useMemo(() => {
    const map = new Map<string, number>();
    (items.data ?? []).forEach((i) => map.set(i.section_id, (map.get(i.section_id) ?? 0) + 1));
    return map;
  }, [items.data]);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8">
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
            <ShieldCheck className="h-4 w-4" /> Shaxsiy seyf
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Ma'lumotlarim</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bo'lim yarating, ichiga rasm, fayl, matn yoki parol qo'shib boring.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Seyfni yopish"
          onClick={() => supabase.auth.signOut()}
          className="text-muted-foreground"
        >
          <LockKeyhole className="h-5 w-5" />
        </Button>
      </header>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Qidirish: universitet hujjatlari, korxona kodlari..."
          className="h-12 pl-11"
        />
      </div>

      <div className="mb-8">
        <SectionForm />
      </div>

      {term && matchedItems.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Topilgan ma'lumotlar</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {matchedItems.map((item) => (
              <ItemCard key={item.id} item={item} sectionName={sectionNames.get(item.section_id)} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Bo'limlar</h2>

        {sections.isLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : matchedSections.length === 0 ? (
          <div className="panel p-8 text-center">
            <FolderOpen className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              {term ? "Bunday bo'lim topilmadi." : "Hozircha bo'lim yo'q. Birinchi bo'limni yarating."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {matchedSections.map((section) => (
              <Link
                key={section.id}
                to="/section/$sectionId"
                params={{ sectionId: section.id }}
                className="panel block p-5 transition-shadow hover:shadow-glow"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold">{section.name}</h3>
                  <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs text-primary">
                    {countBySection.get(section.id) ?? 0} ta
                  </span>
                </div>
                {section.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{section.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {allowedKinds(section).map((kind) => (
                    <span
                      key={kind}
                      className="rounded-full border border-border bg-surface/60 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {kindLabels[kind]}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
