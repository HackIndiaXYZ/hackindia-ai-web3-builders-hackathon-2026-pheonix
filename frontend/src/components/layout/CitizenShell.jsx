import React, { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShoppingBag,
  ArrowRightLeft,
  Key,
  FileText,
  AlertTriangle,
  Bell,
  UserCheck,
  LogOut,
  Map,
  RotateCcw,
  Menu,
  X,
  ShieldCheck,
  Info
} from "lucide-react";

export function CitizenShell({ children }) {
  const { user, logout, resetDemoData, isDeceased } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/auth/citizen", { replace: true });
  };

  const handleReset = () => {
    if (window.confirm("Reset all synthetic demo state back to fixture default?")) {
      resetDemoData();
      window.location.reload();
    }
  };

  const navItems = [
    { to: "/citizen/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/citizen/my-properties", label: "My Properties", icon: Building2 },
    { to: "/citizen/associated-properties", label: "Associated (Nominee)", icon: Users },
    { to: "/citizen/purchases", label: "Purchases & Deeds", icon: ShoppingBag },
    { to: "/citizen/transfers", label: "Transfers & Petitions", icon: ArrowRightLeft },
    { to: "/citizen/sell-keys", label: "Sell Tokens", icon: Key },
    { to: "/citizen/succession", label: "Succession & Heirs", icon: FileText, highlight: isDeceased },
    { to: "/citizen/key-recovery", label: "Key Recovery", icon: AlertTriangle },
    { to: "/citizen/notifications", label: "Notifications", icon: Bell },
    { to: "/citizen/account", label: "Profile & Identity", icon: UserCheck },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] text-[#1D2939] flex flex-col font-sans">
      {/* Tricolor accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

      {/* Demo Sandbox Banner */}
      <div className="bg-[#FFF4E5] border-b border-[#FFE2B3] px-3 sm:px-4 py-1.5 text-center text-xs font-mono text-[#B54708] flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 text-[#D92D20]" />
        <span className="leading-tight">
          <strong>SYNTHETIC DEMO ENVIRONMENT:</strong> Department of Land Resources (TitleLock).
        </span>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 underline text-[11px] font-semibold hover:text-[#7A271A] shrink-0"
        >
          <RotateCcw className="h-3 w-3" /> Reset Demo State
        </button>
      </div>

      {/* Deceased Account Alert Banner (SCN-04) */}
      {isDeceased && (
        <div className="bg-[#FEF3F2] border-b border-[#FECDCA] px-3 sm:px-4 py-2 text-center text-xs text-[#B42318] flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#D92D20]" />
          <span className="leading-snug">
            <strong>STATUS NOTICE — DECEASED RECORD:</strong> Mohan Nair (USR-DEAD-001) is registered as deceased. Active transfer issuance locked. <Link to="/citizen/succession" className="font-bold underline ml-1">Case SUC-2026-001</Link> active.
          </span>
        </div>
      )}

      {/* Official Government Top Header */}
      <header className="bg-white border-b border-[#E4E7EC] shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* National Emblem / Portal Brand */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Link to="/citizen/dashboard" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#0B3A67] flex items-center justify-center text-white font-serif font-bold text-base sm:text-lg shadow-sm border border-[#082949] shrink-0">
                  TL
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-bold text-sm sm:text-base tracking-tight text-[#0B3A67] truncate">TitleLock</span>
                    <span className="rounded bg-[#EBF3FC] text-[#0B3A67] px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shrink-0">
                      Citizen Portal
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-[#475467] uppercase tracking-wider font-semibold truncate hidden sm:block">
                    Government of India • Land Records & Titles
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Center/Right Controls */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#344054] bg-[#F2F4F7] hover:bg-[#E4E7EC] rounded-lg border border-[#D0D5DD] transition-colors"
              >
                <Map className="h-3.5 w-3.5 text-[#0B3A67]" />
                <span>3D Public Map</span>
              </Link>

              {/* User Identity Chip */}
              <div className="flex items-center gap-2.5 pl-3 border-l border-[#E4E7EC]">
                <div className="h-9 w-9 rounded-full bg-[#EBF3FC] border border-[#B9D5F4] flex items-center justify-center text-xs font-bold text-[#0B3A67]">
                  {user?.name ? user.name.split(" ").map(n => n[0]).join("") : "U"}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#101828]">{user?.name || "Citizen"}</span>
                    {isDeceased ? (
                      <span className="rounded bg-[#FEF3F2] text-[#B42318] px-1.5 py-0.2 text-[9px] font-bold uppercase">
                        DECEASED
                      </span>
                    ) : (
                      <span className="rounded bg-[#ECFDF3] text-[#027A48] px-1.5 py-0.2 text-[9px] font-bold uppercase">
                        {user?.identity_status || "ACTIVE"}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#667085] block">{user?.email || user?.id}</span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#D92D20] hover:bg-[#FEF3F2] rounded-lg border border-transparent hover:border-[#FECDCA] transition-colors"
                title="Sign out of portal"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Mobile Toggle */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-lg border border-[#D0D5DD] text-[#344054]"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#E4E7EC] bg-white px-4 pt-2 pb-4 space-y-1">
            <div className="py-2 border-b border-[#E4E7EC] mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#101828]">{user?.name}</p>
                <p className="text-[10px] text-[#667085]">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-[#D92D20] font-medium"
              >
                Sign Out
              </button>
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive ? "bg-[#EBF3FC] text-[#0B3A67] font-semibold" : "text-[#475467] hover:bg-[#F2F4F7]"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#475467] hover:bg-[#F2F4F7]"
            >
              <Map className="h-4 w-4 text-[#0B3A67]" />
              <span>3D Public Map Explorer</span>
            </Link>
          </div>
        )}
      </header>

      {/* Portal Layout with Sidebar + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Left Sidebar Navigation */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24 bg-white rounded-xl border border-[#D0D5DD] shadow-sm p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#98A2B3]">
              Citizen Titleholder Menu
            </div>
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = location.pathname === item.to || (item.to !== "/citizen/dashboard" && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#0B3A67] text-white shadow-sm font-semibold"
                      : "text-[#344054] hover:bg-[#F2F4F7] hover:text-[#101828]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`h-4 w-4 ${isActive ? "text-white" : "text-[#667085]"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && (
                    <span className="inline-block w-2 h-2 rounded-full bg-[#D92D20] animate-pulse" />
                  )}
                </NavLink>
              );
            })}

            <div className="pt-3 mt-3 border-t border-[#EAECF0]">
              <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#EAECF0] text-[11px] text-[#475467]">
                <p className="font-bold text-[#101828] mb-1">Assistance & Support</p>
                <p className="text-[10px] text-[#667085] leading-relaxed">
                  Toll-Free Helpline: 1800-111-TITLE. Working hours 09:30 - 18:00 IST.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Official Footer */}
      <footer className="bg-white border-t border-[#E4E7EC] mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#667085]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#344054]">TitleLock Portal</span>
            <span>•</span>
            <span>Digital India Land Modernization Sandbox</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Version 2.4-SYNTHETIC</span>
            <span>•</span>
            <button onClick={handleReset} className="text-[#0B3A67] hover:underline">Reset Demo Data</button>
            <span>•</span>
            <Link to="/how-it-works" className="hover:underline">Documentation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default CitizenShell;
