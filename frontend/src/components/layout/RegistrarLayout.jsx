import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  Landmark,
  LayoutDashboard,
  Layers,
  FileCheck2,
  Map,
  LogOut,
  Shield,
  AlertCircle,
  Menu,
  X,
  BadgeCheck,
} from "lucide-react";

export function RegistrarLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate("/auth/registrar", { replace: true });
  };

  const navItems = [
    { to: "/registrar/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/registrar/parcels", label: "Jurisdiction Parcels", icon: Layers },
    { to: "/registrar/audit", label: "Audit & Constraints", icon: FileCheck2 },
  ];

  return (
    <div className="min-h-screen w-full bg-[#050811] text-slate-100 flex flex-col">
      {/* Official Government Validation Notice Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-[11px] font-mono text-amber-300 flex items-center justify-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span>
          <strong>Notice:</strong> Demo government directory validation only. This does not verify employment with any government department.
        </span>
      </div>

      {/* Main Administrative Top Bar */}
      <header className="sticky top-0 z-40 border-b border-amber-500/20 bg-[#080d1a]/90 backdrop-blur-xl px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          {/* Official Emblem & Designation */}
          <div className="flex items-center gap-3">
            <Link to="/registrar/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-display font-bold text-sm tracking-wide text-white">
                  <span>State Land Registry</span>
                  <span className="text-amber-400 font-mono text-xs">Registrar Command</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {user?.organization || "Office of the Sub-Registrar, Noida-II"}
                </div>
              </div>
            </Link>

            {/* Badge Indicator Pill */}
            {user?.badge && (
              <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-white/10">
                <span className="flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                  <BadgeCheck className="h-3 w-3 text-amber-400" />
                  {user.badge}
                </span>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                  {user.account_status || "ACTIVE"}
                </span>
              </div>
            )}
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
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
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

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* 3D Map Link */}
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-all font-mono text-[11px]"
            >
              <Map className="h-3.5 w-3.5 text-cyan-400" />
              <span>3D Explorer</span>
            </Link>

            {/* Officer Profile Snippet */}
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-white leading-tight">
                {user?.name || "Sub-Registrar"}
              </span>
              <span className="font-mono text-[10px] text-amber-400 truncate max-w-[150px]">
                {user?.designation || "Sub-Registrar"}
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out of Registrar Portal"
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
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
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

      {/* Main Administrative Work Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8">
        {children}
      </main>

      {/* Official Footer */}
      <footer className="border-t border-white/5 bg-[#080d1a]/80 px-6 py-4 text-center text-[10px] font-mono text-slate-500">
        Office of the Sub-Registrar · Cadastral Adjudication & Mutation Registry
      </footer>
    </div>
  );
}
