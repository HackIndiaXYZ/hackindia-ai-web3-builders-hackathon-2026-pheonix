import React, { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  LayoutDashboard,
  Search,
  Landmark,
  Ban,
  FileSpreadsheet,
  UserCheck,
  LogOut,
  Map,
  RotateCcw,
  Menu,
  X,
  Info,
  ShieldCheck
} from "lucide-react";

export function BankShell({ children }) {
  const { user, logout, resetDemoData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/auth/bank", { replace: true });
  };

  const handleReset = () => {
    if (window.confirm("Reset all synthetic demo state back to fixture default?")) {
      resetDemoData();
      window.location.reload();
    }
  };

  const navItems = [
    { to: "/bank/dashboard", label: "Mortgage Dashboard", icon: LayoutDashboard },
    { to: "/bank/title-checks", label: "Title Verification Desk", icon: Search },
    { to: "/bank/mortgages", label: "Active Encumbrances", icon: Landmark },
    { to: "/bank/blocked-cases", label: "Disputed & Injunctions", icon: Ban },
    { to: "/bank/reports", label: "Lien Clearance Reports", icon: FileSpreadsheet },
    { to: "/bank/account", label: "Credit Officer Profile", icon: UserCheck },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] text-[#1D2939] flex flex-col font-sans">
      {/* Top institutional bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#027A48] via-[#059669] to-[#0B3A67]" />

      {/* Demo Sandbox Banner */}
      <div className="bg-[#ECFDF3] border-b border-[#A6F4C5] px-4 py-1.5 text-center text-xs font-mono text-[#027A48] flex items-center justify-center gap-2">
        <Landmark className="h-3.5 w-3.5 shrink-0 text-[#027A48]" />
        <span>
          <strong>INSTITUTIONAL BANKING CLEARANCE DESK:</strong> Mortgage underwriting & collateral title verification environment.
        </span>
        <button
          onClick={handleReset}
          className="ml-3 inline-flex items-center gap-1 underline text-[11px] font-semibold hover:text-[#054F31]"
        >
          <RotateCcw className="h-3 w-3" /> Reset Demo State
        </button>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-[#E4E7EC] shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <Link to="/bank/dashboard" className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#027A48] flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm border border-[#054F31]">
                  SBI
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base tracking-tight text-[#101828]">State Bank</span>
                    <span className="rounded bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Mortgage Division
                    </span>
                  </div>
                  <p className="text-[10px] text-[#475467] uppercase tracking-wider font-semibold">
                    TitleLock Institutional Lien & Encumbrance Clearance Desk
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Controls */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#344054] bg-[#F2F4F7] hover:bg-[#E4E7EC] rounded-lg border border-[#D0D5DD] transition-colors"
              >
                <Map className="h-3.5 w-3.5 text-[#027A48]" />
                <span>3D Cadastral Map</span>
              </Link>

              {/* Officer Chip */}
              <div className="flex items-center gap-2.5 pl-3 border-l border-[#E4E7EC]">
                <div className="h-9 w-9 rounded-full bg-[#ECFDF3] border border-[#A6F4C5] flex items-center justify-center text-xs font-bold text-[#027A48]">
                  BNK
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#101828]">{user?.name || "Rahul Bansal"}</span>
                    <span className="rounded bg-[#ECFDF3] text-[#027A48] px-1.5 py-0.2 text-[9px] font-bold uppercase">
                      Lien Officer
                    </span>
                  </div>
                  <span className="text-[10px] text-[#667085] block">{user?.email || "rahul.bank@demo.local"}</span>
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

        {/* Mobile menu */}
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
                    isActive ? "bg-[#027A48] text-white font-semibold" : "text-[#475467] hover:bg-[#F2F4F7]"
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
        {/* Left Sidebar */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24 bg-white rounded-xl border border-[#D0D5DD] shadow-sm p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#98A2B3]">
              Institutional Lending Desk
            </div>
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = location.pathname === item.to || (item.to !== "/bank/dashboard" && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#027A48] text-white shadow-sm font-semibold"
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
                <p className="font-bold text-[#101828] mb-1">CERSAI Integration</p>
                <p className="text-[10px] text-[#667085] leading-relaxed">
                  Real-time synchronization with Central Registry of Securitisation Asset Reconstruction and Security Interest.
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

      {/* Footer */}
      <footer className="bg-white border-t border-[#E4E7EC] mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#667085]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#344054]">Institutional TitleLock Console</span>
            <span>•</span>
            <span>Mortgage & Collateral Verification Division</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Statutory Verification Mode</span>
            <span>•</span>
            <button onClick={handleReset} className="text-[#027A48] hover:underline">Reset Demo State</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default BankShell;
