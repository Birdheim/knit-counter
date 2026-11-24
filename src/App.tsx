import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Counter from "./pages/Counter";
import Home from "./pages/Home";
import Projects from "./pages/Projects";

/** Start øverst på siden når du går til en ny side. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/* Sidene. HashRouter gir adresser som /#/prosjekter, som virker på GitHub Pages uten ekstra oppsett.
   En ny side er en ny fil i src/pages og en ny <Route> her. */
export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/prosjekter" element={<Projects />} />
        <Route path="/prosjekt/:id" element={<Counter />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
