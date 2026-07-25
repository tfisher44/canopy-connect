import { NavLink, Route, Routes } from "react-router-dom";
import { FormPage } from "../pages/FormPage";
import { HomePage } from "../pages/HomePage";
import { MapPage } from "../pages/MapPage";

const navClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? "active" : undefined;

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Canopy Connect</h1>
        <p className="muted">Starter scaffold for story intake + ArcGIS map integration.</p>
        <nav className="app-nav" aria-label="Primary">
          <NavLink to="/" end className={navClassName}>
            Home
          </NavLink>
          <NavLink to="/form" className={navClassName}>
            Form
          </NavLink>
          <NavLink to="/map" className={navClassName}>
            Map
          </NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/form" element={<FormPage />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </main>
    </div>
  );
}
