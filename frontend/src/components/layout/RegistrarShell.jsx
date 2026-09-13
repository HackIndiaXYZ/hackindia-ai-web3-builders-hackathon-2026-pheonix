import React, { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  LayoutDashboard,
  Inbox,
  Building2,
  FileCheck2,
  AlertOctagon,
  ShieldAlert,
  Lock,
  History,
  UserCheck,
  LogOut,
  Map,
  RotateCcw,
  Menu,
  X,
  Repeat,
  Info,
  ExternalLink
} from "lucide-react";

export function RegistrarShell({ children }) {
  const { user, logout, resetDemoData, switchWorkspace, isRestricted } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const canSwitchToAuditor = Array.isArray(user?.roles) && user.roles.includes("AUDITOR");

  const handleLogout = () => {
    logout();
    navigate("/auth/registrar", { replace: true });
  };

  const handleReset = () => {
    if (window.confirm("Reset all synthetic demo state back to fixture default?")) {
      resetDemoData();
      window.location.reload();
    }
  };

  const handleSwitchToAuditor = () => {
    switchWorkspace("AUDITOR");
    navigate("/auditor/dashboard");
  };

  const navItems = [
    { to: "/registrar/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/registrar/transfers", label: "Transfer Petitions", icon: Inbox },
    { to: "/registrar/succession", label: "Succession Desk", icon: FileCheck2 },
    { to: "/registrar/risk-review", label: "Risk Reviews", icon: AlertOctagon },
    { to: "/registrar/audit", label: "Immutable Audit Log", icon: History },
    { to: "/registrar/account", label: "Officer Credentials", icon: UserCheck },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] text-[#1D2939] flex flex-col font-sans">
      {/* Tricolor official bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

      {/* Demo Sandbox Banner */}
      <div className="bg-[#FEF6EE] border-b border-[#F9DBAF] px-3 sm:px-4 py-1.5 text-center text-xs font-mono text-[#B54708] flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 text-[#D92D20]" />
        <span className="leading-tight">
          <strong>OFFICIAL SUB-REGISTRAR WORKSPACE:</strong> TitleLock Cadastral Adjudication Authority.
        </span>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 underline text-[11px] font-semibold hover:text-[#7A271A] shrink-0"
        >
          <RotateCcw className="h-3 w-3" /> Reset Demo State
        </button>
      </div>

      {/* Restricted Officer Warning Banner (SCN-16) */}
      {isRestricted && (
        <div className="bg-[#FEF3F2] border-b border-[#FECDCA] px-3 sm:px-4 py-2 text-center text-xs text-[#B42318] flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-[#D92D20]" />
          <span className="leading-snug">
            <strong>RESTRICTED STATUS (SCN-16):</strong> Officer {user?.name} ({user?.badge}) has dual-role restrictions. Final transfer execution locked.
          </span>
        </div>
      )}

      {/* Official Top Header */}
      <header className="bg-white border-b border-[#E4E7EC] shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* National Emblem / Brand */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Link to="/registrar/dashboard" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#0B3A67] flex items-center justify-center text-white font-serif font-bold text-base sm:text-lg shadow-sm border border-[#082949] shrink-0">
                  SR
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-bold text-sm sm:text-base tracking-tight text-[#0B3A67] truncate">Sub-Registrar</span>
                    <span className="rounded bg-[#0B3A67] text-white px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0">
                      Adjudication
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-[#475467] uppercase tracking-wider font-semibold truncate hidden sm:block">
                    Department of Registration & Stamps • Jurisdiction Noida-Gr.Noida
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Center/Right Controls */}
            <div className="hidden md:flex items-center gap-3">
              {/* Multi-role Workspace Switcher (SCN-16) */}
              {canSwitchToAuditor && (
                <button
                  onClick={handleSwitchToAuditor}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B3A67] bg-[#EBF3FC] hover:bg-[#D4E6FA] rounded-lg border border-[#B9D5F4] transition-colors"
                  title="Switch to State Auditor Workspace"
                >
                  <Repeat className="h-3.5 w-3.5 text-[#0B3A67]" />
                  <span>Switch to Auditor Desk</span>
                </button>
              )}

              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#344054] bg-[#F2F4F7] hover:bg-[#E4E7EC] rounded-lg border border-[#D0D5DD] transition-colors"
              >
                <Map className="h-3.5 w-3.5 text-[#0B3A67]" />
                <span>3D Cadastral Map</span>
              </Link>

              {/* Officer Badge Chip */}
              <div className="flex items-center gap-2.5 pl-3 border-l border-[#E4E7EC]">
                <div className="h-9 w-9 rounded-full bg-[#EBF3FC] border border-[#B9D5F4] flex items-center justify-center text-xs font-bold text-[#0B3A67]">
                  {user?.badge?.slice(0, 3) || "REG"}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#101828]">{user?.name || "Sub-Registrar"}</span>
                    <span className="rounded bg-[#EBF3FC] text-[#0B3A67] px-1.5 py-0.2 text-[9px] font-mono font-bold">
                      {user?.badge || "GOV-REG-0182"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#667085] block">{user?.designation || "Sub-Registrar Grade I"}</span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#D92D20] hover:bg-[#FEF3F2] rounded-lg border border-transparent hover:border-[#FECDCA] transition-colors"
                title="Sign out of Registrar Desk"
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

            {canSwitchToAuditor && (
              <button
                onClick={handleSwitchToAuditor}
                className="w-full mb-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-[#0B3A67] bg-[#EBF3FC] rounded-lg border border-[#B9D5F4]"
              >
                <Repeat className="h-3.5 w-3.5" />
                <span>Switch to Auditor Desk</span>
              </button>
            )}

            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive ? "bg-[#0B3A67] text-white font-semibold" : "text-[#475467] hover:bg-[#F2F4F7]"
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
              Registrar Adjudication Desk
            </div>
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = location.pathname === item.to || (item.to !== "/registrar/dashboard" && location.pathname.startsWith(item.to));
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
                </NavLink>
              );
            })}

            <div className="pt-3 mt-3 border-t border-[#EAECF0]">
              <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#EAECF0] text-[11px] text-[#475467]">
                <p className="font-bold text-[#101828] mb-1">Statutory Authority</p>
                <p className="text-[10px] text-[#667085] leading-relaxed">
                  Operating under Registration Act 1908 & Information Technology Act 2000.
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
            <span className="font-semibold text-[#344054]">Registrar Adjudication Console</span>
            <span>•</span>
            <span>Office of the Sub-Registrar Gautam Buddha Nagar</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Secured Session Active</span>
            <span>•</span>
            <button onClick={handleReset} className="text-[#0B3A67] hover:underline">Reset Demo State</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default RegistrarShell;
