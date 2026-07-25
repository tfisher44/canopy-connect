import { Route, Routes } from "react-router-dom";
import { StyleCompliantComponentsView } from "../features/style-guidelines/components/StyleCompliantComponentsView";
import { createInMemoryStyleComplianceCatalogProvider } from "../features/style-guidelines/services/inMemoryStyleComplianceCatalogProvider";
import { AppShell } from "./layout/AppShell";

const styleComplianceCatalogProvider = createInMemoryStyleComplianceCatalogProvider();

export function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />} />
      <Route path="/form" element={<AppShell />} />
      <Route path="/map" element={<AppShell />} />
      <Route
        path="/style-guidelines/components"
        element={
          <AppShell
            panelContent={<StyleCompliantComponentsView provider={styleComplianceCatalogProvider} />}
            panelLabel="Style-compliant components panel"
            defaultPanelOpen
          />
        }
      />
      <Route path="*" element={<AppShell />} />
    </Routes>
  );
}
