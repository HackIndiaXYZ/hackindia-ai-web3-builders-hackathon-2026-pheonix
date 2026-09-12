import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "./hooks/useAuth.js";
import { useHashRoute, parseRoute } from "./hooks/useHashRoute.js";
import { apiGet } from "./lib/api.js";
import { Sidebar } from "./components/Sidebar.jsx";
import { TopBar } from "./components/TopBar.jsx";

import { Dashboard } from "./pages/Dashboard.jsx";
import { Registry } from "./pages/Registry.jsx";
import { ParcelDetail } from "./pages/ParcelDetail.jsx";
import { RegisterParcel } from "./pages/RegisterParcel.jsx";
import { TransferPage } from "./pages/Transfer.jsx";
import { BlockchainExplorer } from "./pages/BlockchainExplorer.jsx";
import { LoginPage } from "./pages/Login.jsx";

// Simple, consistent page-transition variants — a fade + slight rise reads
// as "premium" without being distracting on every navigation.
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function resolvePage(path, rest, auth, config) {
  if (path === "/login") return <LoginPage auth={auth} />;
  if (path === "/registry" && rest) return <ParcelDetail ulpin={decodeURIComponent(rest)} />;
  if (path === "/registry") return <Registry />;
  if (path === "/register") return <RegisterParcel auth={auth} />;
  if (path === "/transfer") return <TransferPage auth={auth} />;
  if (path === "/chain") return <BlockchainExplorer />;
  return <Dashboard auth={auth} config={config} />;
}

export default function App() {
  const auth = useAuth();
  const hash = useHashRoute();
  const { path, rest } = parseRoute(hash);

  // The chain mode was previously hardcoded to "mock" in the TopBar, which
  // would have silently misreported the system after switching to
  // CHAIN_MODE=live. It now comes from the backend.
  const [config, setConfig] = useState(null);
  useEffect(() => { apiGet("/config").then(setConfig).catch(() => {}); }, []);

  // Login is deliberately full-bleed (no sidebar chrome around a sign-in
  // form — keeps focus on the single task), everything else lives inside
  // the standard shell.
  if (path === "/login") {
    return (
      <div className="min-h-screen bg-base-950 text-zinc-100">
        <AnimatePresence mode="wait">
          <motion.div
            key="login"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <LoginPage auth={auth} />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-950 text-zinc-100">
      <Sidebar auth={auth} route={path} />

      <div className="pl-64">
        <TopBar route={path} config={config} />

        <main className="mx-auto max-w-6xl px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={path + rest}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {resolvePage(path, rest, auth, config)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
