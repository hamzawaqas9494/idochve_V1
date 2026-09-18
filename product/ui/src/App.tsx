import { useEffect, useState } from "react";
import { getSession, login, logout, type User } from "./api";
import { Shell } from "./Shell";
import { LoginPage } from "./pages/LoginPage";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSession()
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  async function onLogin(email: string, password: string) {
    setError("");
    try {
      const result = await login(email, password);
      setUser(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access denied.");
    }
  }

  async function onLogout() {
    await logout();
    setUser(null);
  }

  if (!ready) {
    return <p style={{ padding: 24 }}>Loading...</p>;
  }

  if (!user) {
    return <LoginPage onSubmit={onLogin} error={error} />;
  }

  return <Shell user={user} onLogout={onLogout} />;
}
