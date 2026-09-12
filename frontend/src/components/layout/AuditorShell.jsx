import React, { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Inbox,
  Building2,
  ShieldAlert,
  Lock,
  Boxes,
  FileCheck,
  UserCheck,
  LogOut,
  Map,
  RotateCcw,
  Menu,
  X,
  Repeat,
  Info,
  Shield
} from "lucide-react";

export function AuditorShell({ children }) {
  const { user, logout, resetDemoData, switchWorkspace } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const canSwitchToRegistrar = Array.isArray(user?.roles) && user.roles.includes("REGISTRAR");

  const handleLogout = () => {
    logout();
    navigate("/auth/auditor", { replace: true });
  };

  const handleReset = () => {
    if (window.confirm("Reset all synthetic demo state back to fixture default?")) {
      resetDemoData();
      window.location.reload();
    }
  };

  const handleSwitchToRegistrar = () => {
    switchWorkspace("REGISTRAR");
    navigate("/registrar/dashboard");
  };

  const navItems = [
    { to: "/auditor/dashboard", label: "Oversight Dashboard", icon: LayoutDashboard },
    { to: "/auditor/events", label: "Cryptographic Audit Ledger", icon: FileSpreadsheet },
    { to: "/auditor/transfers", label: "Transfer Scrutiny", icon: Inbox },
    { to: "/auditor/parcels", label: "Chain of Custody", icon: Building2 },
    { to: "/auditor/overrides", label: "Override Inquiries", icon: ShieldAlert },
    { to: "/auditor/frozen-parcels", label: "Court Freezes", icon: Lock },
    { to: "/auditor/blockchain", label: "On-Chain Blocks", icon: Boxes },
    { to: "/auditor/reports", label: "Statutory Reports", icon: FileCheck },
    { to: "/auditor/account", label: "Auditor Profile", icon: UserCheck },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] text-[#1D2939] flex flex-col font-sans">
      {/* Official top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#0E7090] via-[#0284C7] to-[#047857]" />

      {/* Demo Sandbox Banner */}
      <div className="bg-[#ECFEFF] border-b border-[#BAE6FD] px-3 sm:px-4 py-1.5 text-center text-xs font-mono text-[#0369A1] flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <Shield className="h-3.5 w-3.5 shrink-0 text-[#0284C7]" />
        <span className="leading-tight">
          <strong>STATE AUDIT DIRECTORATE:</strong> Read-only immutable ledger oversight.
        </span>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 underline text-[11px] font-semibold hover:text-[#0C4A6E] shrink-0"
        >
          <RotateCcw className="h-3 w-3" /> Reset Demo State
        </button>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-[#E4E7EC] shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Directorate Branding */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Link to="/auditor/dashboard" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#0E7090] flex items-center justify-center text-white font-serif font-bold text-base sm:text-lg shadow-sm border border-[#155E75] shrink-0">
                  AD
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-bold text-sm sm:text-base tracking-tight text-[#0F172A] truncate">State Land Audit</span>
                    <span className="rounded bg-[#ECFEFF] text-[#0E7090] border border-[#BAE6FD] px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0">
                      Directorate
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-[#475467] uppercase tracking-wider font-semibold truncate hidden sm:block">
                    Comptroller & Cadastral Oversight • Independent Audit Authority
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Controls */}
            <div className="hidden md:flex items-center gap-3">
              {canSwitchToRegistrar && (
                <button
                  onClick={handleSwitchToRegistrar}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0E7090] bg-[#ECFEFF] hover:bg-[#CFFAFE] rounded-lg border border-[#BAE6FD] transition-colors"
                  title="Switch to Sub-Registrar Adjudication Desk"
                >
                  <Repeat className="h-3.5 w-3.5 text-[#0E7090]" />
                  <span>Switch to Registrar Desk</span>
                </button>
              )}

              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#344054] bg-[#F2F4F7] hover:bg-[#E4E7EC] rounded-lg border border-[#D0D5DD] transition-colors"
              >
                <Map className="h-3.5 w-3.5 text-[#0E7090]" />
                <span>3D Public Map</span>
              </Link>

              {/* Auditor Badge Chip */}
              <div className="flex items-center gap-2.5 pl-3 border-l border-[#E4E7EC]">
                <div className="h-9 w-9 rounded-full bg-[#ECFEFF] border border-[#BAE6FD] flex items-center justify-center text-xs font-bold text-[#0E7090]">
                  {user?.badge?.slice(0, 3) || "AUD"}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#101828]">{user?.name || "Auditor"}</span>
                    <span className="rounded bg-[#ECFEFF] text-[#0E7090] px-1.5 py-0.2 text-[9px] font-mono font-bold">
                      {user?.badge || "AUD-0094"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#667085] block">{user?.designation || "Senior Title Auditor"}</span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#D92D20] hover:bg-[#FEF3F2] rounded-lg border border-transparent hover:border-[#FECDCA] transition-colors"
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
                <p className="text-[10px] text-[#667085]">{user?.badge} • {user?.designation}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-[#D92D20] font-medium"
              >
                Sign Out
              </button>
            </div>

            {canSwitchToRegistrar && (
              <button
                onClick={handleSwitchToRegistrar}
                className="w-full mb-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-[#0E7090] bg-[#ECFEFF] rounded-lg border border-[#BAE6FD]"
              >
                <Repeat className="h-3.5 w-3.5" />
                <span>Switch to Registrar Desk</span>
              </button>
            )}

            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive ? "bg-[#0E7090] text-white font-semibold" : "text-[#475467] hover:bg-[#F2F4F7]"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* Portal Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Left Sidebar Navigation */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24 bg-white rounded-xl border border-[#D0D5DD] shadow-sm p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#98A2B3]">
              Directorate Audit Console
            </div>
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = location.pathname === item.to || (item.to !== "/auditor/dashboard" && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#0E7090] text-white shadow-sm font-semibold"
                      : "text-[#344054] hover:bg-[#F2F4F7] hover:text-[#101828]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`h-4 w-4 ${isActive ? "text-white" : "text-[#667085]"}`} />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}

            <div className="pt-3 mt-3 border-t border-[#EAECF0]">
              <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#EAECF0] text-[11px] text-[#475467]">
                <p className="font-bold text-[#101828] mb-1">Audit Mandate</p>
                <p className="text-[10px] text-[#667085] leading-relaxed">
                  Dual-ledger consensus verification against Ethereum smart contracts and sub-registrar journals.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Official Footer */}
      <footer className="bg-white border-t border-[#E4E7EC] mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#667085]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#344054]">State Land Audit Directorate</span>
            <span>•</span>
            <span>Cryptographic Title Verification Framework</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Immutable Mode Active</span>
            <span>•</span>
            <button onClick={handleReset} className="text-[#0E7090] hover:underline">Reset Demo State</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AuditorShell;
