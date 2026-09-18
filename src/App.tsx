import { Route, Routes } from "react-router";
import { AppShell } from "./components/AppShell";
import { HomePage } from "./pages/HomePage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { DeploymentPage } from "./pages/DeploymentPage";
import { GovernmentPage } from "./pages/GovernmentPage";
import { BookPage } from "./pages/BookPage";
import { PrivacyPage } from "./pages/PrivacyPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/deployment" element={<DeploymentPage />} />
        <Route path="/government" element={<GovernmentPage />} />
        <Route path="/book" element={<BookPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/ar" element={<HomePage />} />
        <Route path="/ar/how-it-works" element={<HowItWorksPage />} />
        <Route path="/ar/deployment" element={<DeploymentPage />} />
        <Route path="/ar/government" element={<GovernmentPage />} />
        <Route path="/ar/book" element={<BookPage />} />
        <Route path="/ar/privacy" element={<PrivacyPage />} />
      </Route>
    </Routes>
  );
}
