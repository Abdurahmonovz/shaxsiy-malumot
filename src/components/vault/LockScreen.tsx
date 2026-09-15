import { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeDate, unlockWithDate } from "@/lib/vault";

export function LockScreen() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const date = normalizeDate(value);
    if (!date) {
      setError("Sanani kun.oy.yil ko'rinishida yozing, masalan 21.06.2005");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await unlockWithDate(date);
    setBusy(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Lock className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-semibold">Shaxsiy seyf</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hujjatlar, rasmlar, parollar va kodlar — bir joyda, faqat siz uchun.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="date">Tug'ilgan sanangiz</Label>
            <Input
              id="date"
              inputMode="numeric"
              autoComplete="off"
              placeholder="21.06.2005"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-12 text-center text-lg tracking-widest"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
            {busy ? "Ochilmoqda..." : "Seyfni ochish"}
          </Button>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            Birinchi kirishda yozgan sanangiz doimiy kalitga aylanadi. Ma'lumotlaringizni
            faqat shu sana bilan ko'rish mumkin.
          </p>
        </form>
      </div>
    </main>
  );
}
