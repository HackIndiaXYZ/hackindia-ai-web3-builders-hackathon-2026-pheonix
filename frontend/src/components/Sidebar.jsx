import { motion } from "framer-motion";
import {
  FiGrid, FiDatabase, FiPlusSquare, FiRepeat, FiLink, FiLogOut, FiUser,
} from "react-icons/fi";
import { navigate } from "../hooks/useHashRoute.js";

const LINKS = [
  { path: "/dashboard", label: "Dashboard", icon: FiGrid },
  { path: "/registry", label: "Registry", icon: FiDatabase },
  { path: "/register", label: "Register Parcel", icon: FiPlusSquare },
  { path: "/transfer", label: "Transfer", icon: FiRepeat },
  { path: "/chain", label: "Blockchain Explorer", icon: FiLink },
];

export function Sidebar({ auth, route }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-white/5 bg-base-900/70 backdrop-blur-xl">
      {/* Brand */}
      <div
        className="flex h-16 shrink-0 cursor-pointer items-center gap-2.5 px-6"
        onClick={() => navigate("/dashboard")}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent shadow-glow-sm">
          <span className="font-mono text-sm font-bold text-black">PR</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-white leading-none">Parcel Register</div>
          <div className="mt-1 text-[11px] text-zinc-500 leading-none">Land Title Verification</div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {LINKS.map(({ path, label, icon: Icon }) => {
          const active = route === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                active ? "text-white" : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-lg bg-accent/10 ring-1 ring-accent/40 shadow-glow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent shadow-[0_0_8px_1px_#FF6A00]" />
              )}
              <Icon className={`relative z-10 h-[18px] w-[18px] ${active ? "text-accent" : ""}`} />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Auth footer */}
      <div className="border-t border-white/5 p-3">
        {auth.user ? (
          <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-base-700">
              <FiUser className="h-4 w-4 text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{auth.user.username}</div>
              <div className="font-mono text-[10px] text-accent">{auth.user.role}</div>
            </div>
            <button
              onClick={() => { auth.logout(); navigate("/dashboard"); }}
              className="text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Log out"
            >
              <FiLogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover"
          >
            Log in
          </button>
        )}
      </div>
    </aside>
  );
}
