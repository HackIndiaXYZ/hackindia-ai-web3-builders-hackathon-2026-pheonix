import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getDemoNotifications, markDemoNotificationRead } from "../../lib/store.js";
import { formatDate } from "../../lib/utils.js";
import { Bell, ArrowRight, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

export function Notifications() {
  const [notifications, setNotifications] = useState(() => getDemoNotifications());

  const handleMarkRead = (id) => {
    const updated = markDemoNotificationRead(id);
    setNotifications(updated);
  };

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAECF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Statutory Notifications & Deed Alerts
          </h1>
          <p className="mt-1 text-xs text-[#475467]">
            Official alerts regarding conveyance applications, succession petitions, and title status adjustments.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => {
          const isRead = n.read || false;
          return (
            <div
              key={n.id || n.notification_id}
              className={`rounded-xl border p-4 shadow-sm flex items-start gap-3.5 text-xs transition-colors ${
                isRead ? "border-[#EAECF0] bg-white text-[#475467]" : "border-[#B9D5F4] bg-[#F8FAFC] text-[#101828]"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EFF8FF] text-[#0B3A67] border border-[#B9D5F4]">
                <Bell className="h-4 w-4" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#101828]">
                      {n.title || n.type?.replace(/_/g, " ")}
                    </span>
                    {!isRead && (
                      <span className="h-2 w-2 rounded-full bg-[#175CD3]" title="Unread" />
                    )}
                  </div>
                  <span className="text-[11px] text-[#667085] font-mono">
                    {formatDate(n.timestamp || n.created_at)}
                  </span>
                </div>

                <p className="text-[#475467] leading-relaxed">
                  {n.message || n.body}
                </p>

                <div className="pt-1 flex items-center justify-between">
                  {n.ulpin ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[#0B3A67] font-semibold">
                        Parcel: {n.ulpin}
                      </span>
                      <Link
                        to={`/citizen/properties/${n.ulpin}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B3A67] hover:underline"
                      >
                        <span>View Parcel</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : <div />}

                  {!isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id || n.notification_id)}
                      className="text-[11px] font-semibold text-[#0B3A67] hover:underline"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Notifications;
