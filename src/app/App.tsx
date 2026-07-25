import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />} />
      <Route path="/form" element={<AppShell />} />
      <Route path="/map" element={<AppShell />} />
      <Route path="*" element={<AppShell />} />
    </Routes>
  );
}
