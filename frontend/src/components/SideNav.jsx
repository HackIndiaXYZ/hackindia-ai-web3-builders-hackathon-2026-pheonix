import React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  MapPin,
  HelpCircle,
  LayoutDashboard,
  Home,
  Bell,
  UserCheck,
  ArrowRight,
  FileSpreadsheet,
  ArrowRightLeft,
  ListOrdered,
  FileCheck2,
  ShieldAlert,
} from "lucide-react";

/**
 * SideNav component strictly enforcing role boundaries.
 * In Public Mode: ONLY "Explore land records", "How it works", and "Sign in to view more".
 */
export function SideNav({ portal = "public" }) {
  const location = useLocation();

  const publicLinks = [
    {
      name: "Explore land records",
      to: "/",
      icon: MapPin,
    },
    {
      name: "How it works",
      to: "/how-it-works",
      icon: HelpCircle,
    },
  ];

  const citizenLinks = [
    {
      name: "Dashboard",
      to: "/citizen/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "My property",
      to: "/citizen/my-property",
      icon: Home,
    },
    {
      name: "Notifications",
      to: "/citizen/notifications",
      icon: Bell,
    },
    {
      name: "My account",
      to: "/citizen/account",
      icon: UserCheck,
    },
  ];

  const registrarLinks = [
    {
      name: "Transfer Desk",
      to: "/registrar/transfer-desk",
      icon: ArrowRightLeft,
      badge: "Hero",
    },
    {
      name: "Dashboard",
      to: "/registrar/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Parcel Register",
      to: "/registrar/parcels",
      icon: FileSpreadsheet,
    },
    {
      name: "Queue",
      to: "/registrar/queue",
      icon: ListOrdered,
    },
    {
      name: "Audit Log",
      to: "/registrar/audit",
      icon: FileCheck2,
    },
  ];

  let links = publicLinks;
  if (portal === "citizen") links = citizenLinks;
  if (portal === "registrar") links = registrarLinks;

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-[#D0D5DD] flex flex-col justify-between h-[calc(100vh-67px)] select-none">
      <div className="p-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-[#667085] uppercase">
          {portal === "public" && "Public Services"}
          {portal === "citizen" && "Citizen Workspace"}
          {portal === "registrar" && "Official Operations"}
        </div>

        <nav className="space-y-1" aria-label="Sidebar Navigation">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#F7F9FC] text-[#0B3A67] border border-[#D0D5DD] shadow-sm font-semibold"
                    : "text-[#344054] hover:bg-[#F8FAFC] hover:text-[#101828]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-[#0B3A67]" : "text-[#667085]"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="rounded bg-[#0B3A67] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Public Sign-In prompt or Government Notice */}
      <div className="p-4 border-t border-[#D0D5DD] bg-[#F7F9FC]">
        {portal === "public" ? (
          <div className="space-y-2.5 text-left">
            <p className="text-xs text-[#475467] leading-relaxed">
              Are you a titleholder, nominee, or authorized official?
            </p>
            <Link
              to="/auth/citizen"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B3A67] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] hover-lift shadow-sm"
            >
              <span>Sign in to view more</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : portal === "citizen" ? (
          <div className="rounded-md border border-[#D0D5DD] bg-white p-2.5 text-left">
            <div className="text-[11px] font-semibold text-[#101828] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#0F766E]" />
              Encumbrance-Free Title
            </div>
            <p className="mt-1 text-[10px] text-[#667085] leading-tight">
              Cryptographically audited under Government Cadastral Registry rules.
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-2.5 text-left">
            <div className="text-[11px] font-semibold text-[#B42318] flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              Audited Session
            </div>
            <p className="mt-1 text-[10px] text-[#B42318] leading-tight">
              Authorised government use only. All title approvals and overrides are logged immutably.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
