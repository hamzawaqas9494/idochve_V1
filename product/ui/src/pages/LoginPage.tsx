import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage({
  onSubmit,
  error,
}: {
  onSubmit: (email: string, password: string) => void;
  error: string;
}) {
  const [email, setEmail] = useState("records.officer@nia.example");
  const [password, setPassword] = useState("ChangeMePilot!");

  function handle(event: FormEvent) {
    event.preventDefault();
    onSubmit(email, password);
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--navy-950)] p-6 text-[var(--white)]">
      <form onSubmit={handle} className="w-[min(28rem,100%)] rounded-2xl bg-[var(--navy-900)] p-6">
        <p className="m-0 text-xs tracking-[0.16em] text-[var(--teal-600)]">PILOT ACCESS</p>
        <h1 className="mb-2 mt-2 text-[28px]">iDocHive</h1>
        <p className="text-sm text-[var(--border)]">
          Customer-controlled environment. There is no public signup. Identity is enforced in ColdFusion before any
          document query.
        </p>
        <Label className="mt-4">
          Work email
          <Input value={email} onChange={(event) => setEmail(event.target.value)} />
        </Label>
        <Label className="mt-3">
          Password
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Label>
        {error ? <p className="text-[var(--danger)]">{error}</p> : null}
        <Button type="submit" className="mt-4 w-full">
          Continue
        </Button>
      </form>
    </div>
  );
}
