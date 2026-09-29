import { useState } from "react";
import { ArrowLeft, KeyRound, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeDate, unlockWithDate, resetVaultPassword } from "@/lib/vault";

type Mode = "unlock" | "reset";

export function LockScreen() {
  const [mode, setMode] = useState<Mode>("unlock");
  const [value, setValue] = useState("");
  const [oldDate, setOldDate] = useState("");
  const [newDate, setNewDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    const date = normalizeDate(value);
    if (!date) {
      setError("Sanani kun.oy.yil ko'rinishida yozing (KK.OO.YYYY)");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await unlockWithDate(date);
    setBusy(false);
    if (!result.ok) setError(result.message);
  }

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    const oldNorm = normalizeDate(oldDate);
    const newNorm = normalizeDate(newDate);
    if (!oldNorm) {
      setError("Eski sanani KK.OO.YYYY formatida kiriting");
      return;
    }
    if (!newNorm) {
      setError("Yangi sanani KK.OO.YYYY formatida kiriting");
      return;
    }
    if (oldNorm === newNorm) {
      setError("Yangi sana eskisidan farq qilishi kerak");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await resetVaultPassword(oldNorm, newNorm);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
    } else {
      setSuccess("Kalit muvaffaqiyatli yangilandi! Endi yangi sana bilan kiring.");
      setOldDate("");
      setNewDate("");
      setTimeout(() => {
        setMode("unlock");
        setSuccess(null);
        setValue("");
      }, 2000);
    }
  }

  function switchMode(target: Mode) {
    setMode(target);
    setError(null);
    setSuccess(null);
    setValue("");
    setOldDate("");
    setNewDate("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/15 text-primary ring-1 ring-primary/30">
            {mode === "unlock" ? (
              <Lock className="h-7 w-7" />
            ) : (
              <KeyRound className="h-7 w-7" />
            )}
          </span>
          <h1 className="text-2xl font-semibold">
            {mode === "unlock" ? "Shaxsiy seyf" : "Kalitni yangilash"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "unlock"
              ? "Hujjatlar, rasmlar, parollar va kodlar — bir joyda, faqat siz uchun."
              : "Eski sanani kiritib, yangi kalit sanasini o'rnating."}
          </p>
        </div>

        {mode === "unlock" ? (
          <form onSubmit={handleUnlock} className="panel space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="date">Tug'ilgan sanangiz</Label>
              <Input
                id="date"
                inputMode="numeric"
                autoComplete="off"
                placeholder="KK.OO.YYYY"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-12 text-center text-lg tracking-widest"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
              {busy ? "Ochilmoqda..." : "Seyfni ochish"}
            </Button>

            <button
              type="button"
              onClick={() => switchMode("reset")}
              className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Kalitni yangilash
            </button>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Birinchi kirishda yozgan sanangiz doimiy kalitga aylanadi. Ma'lumotlaringizni
              faqat shu sana bilan ko'rish mumkin.
            </p>
          </form>
        ) : (
          <form onSubmit={handleReset} className="panel space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="old-date">Eski sana (hozirgi kalit)</Label>
              <Input
                id="old-date"
                inputMode="numeric"
                autoComplete="off"
                placeholder="KK.OO.YYYY"
                value={oldDate}
                onChange={(e) => setOldDate(e.target.value)}
                className="h-12 text-center text-lg tracking-widest"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-date">Yangi sana (yangi kalit)</Label>
              <Input
                id="new-date"
                inputMode="numeric"
                autoComplete="off"
                placeholder="KK.OO.YYYY"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="h-12 text-center text-lg tracking-widest"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? <p className="text-sm text-green-500">{success}</p> : null}

            <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
              {busy ? "Yangilanmoqda..." : "Kalitni yangilash"}
            </Button>

            <button
              type="button"
              onClick={() => switchMode("unlock")}
              className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Orqaga qaytish
            </button>
          </form>
        )}

        <div className="mt-6 rounded-xl border border-border/50 bg-card/40 p-4 text-center text-xs text-muted-foreground backdrop-blur">
          <p className="flex items-center justify-center gap-1.5 font-medium text-foreground">
            <Smartphone className="h-4 w-4 text-primary" /> Telefonga ilova qilib o'rnatish:
          </p>
          <p className="mt-1 text-[11px] leading-relaxed">
            Brauzer menyusidagi (iOS: Ulashish / Android: 3 nuqta) <strong>"Bosh ekranga qo'shish"</strong> tugmasini bosing.
          </p>
        </div>
      </div>
    </main>
  );
}
