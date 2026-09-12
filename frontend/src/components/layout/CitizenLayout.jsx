import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  ShieldCheck,
  LayoutDashboard,
  Home,
  UserCheck,
  Map,
  LogOut,
  Info,
  Wallet,
  Menu,
  X,
} from "lucide-react";

export function CitizenLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate("/auth/citizen", { replace: true });
  };

  const navItems = [
    { to: "/citizen/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/citizen/properties", label: "My Properties", icon: Home },
    { to: "/citizen/account", label: "Identity & Account", icon: UserCheck },
  ];

  return (
    <div className="min-h-screen w-full bg-navy-950 text-slate-100 flex flex-col">
      {/* Top Demo Environment Notice Banner */}
      <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-4 py-1.5 text-center text-[11px] font-mono text-cyan-300 flex items-center justify-center gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
        <span>
          <strong>Demo environment:</strong> Synthetic data for demonstration only. This interface does not establish legal ownership.
        </span>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-900/85 backdrop-blur-xl px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          {/* Brand Logo & Portal Tag */}
          <div className="flex items-center gap-3">
            <Link to="/citizen/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-glow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-display font-bold text-sm tracking-wide text-white">
                  <span>TitleLock</span>
                  <span className="text-cyan-400 font-mono text-xs">Citizen</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Cadastral Titleholder Portal
                </div>
              </div>
            </Link>

            {/* Role Chips */}
            <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-white/10">
              {(user?.roles || ["OWNER"]).map((r) => (
                <span
                  key={r}
                  className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300 uppercase tracking-wider"
                >
                  {r}
                </span>
              ))}
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-400">
                {user?.identity_status || "VERIFIED"}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const IconComp = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <IconComp className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right User Bar & Actions */}
          <div className="flex items-center gap-3">
            {/* View 3D Public Map */}
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-all font-mono text-[11px]"
            >
              <Map className="h-3.5 w-3.5 text-cyan-400" />
              <span>3D Explorer</span>
            </Link>

            {/* Citizen Identity Badge */}
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-white leading-tight">
                {user?.name || "Citizen User"}
              </span>
              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                {user?.email || "rajesh@demo.local"}
              </span>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out of Citizen Portal"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition-all"
            >
              <LogOut className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileNavOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-white/10 space-y-1">
            {navItems.map((item) => {
              const IconComp = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <IconComp className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            <Link
              to="/"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              <Map className="h-4 w-4 text-cyan-400" />
              <span>3D Public Map Explorer</span>
            </Link>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-navy-950/80 px-6 py-4 text-center text-[10px] font-mono text-slate-500">
        TitleLock Explorer · Citizen Portal · Synthetic Verification Environment
      </footer>
    </div>
  );
}
