import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

// Layout Shells
import { CitizenShell } from "./components/layout/CitizenShell.jsx";
import { RegistrarShell } from "./components/layout/RegistrarShell.jsx";
import { AuditorShell } from "./components/layout/AuditorShell.jsx";
import { BankShell } from "./components/layout/BankShell.jsx";

// Public Pages
import { ExplorerPage } from "./pages/public/Explorer.jsx";
import { HowItWorks } from "./pages/public/HowItWorks.jsx";
import { NotFound } from "./pages/public/NotFound.jsx";
import { AccessDenied } from "./pages/auth/AccessDenied.jsx";
import { WorkflowPage } from "./pages/Workflow.jsx";

// Auth Pages
import { CitizenAuth } from "./pages/auth/CitizenAuth.jsx";
import { RegistrarAuth } from "./pages/auth/RegistrarAuth.jsx";
import { AuditorAuth } from "./pages/auth/AuditorAuth.jsx";
import { BankAuth } from "./pages/auth/BankAuth.jsx";
// Citizen Portal Pages
import { CitizenDashboard } from "./pages/citizen/Dashboard.jsx";
import { MyProperty } from "./pages/citizen/MyProperty.jsx";
import { PropertyDetail } from "./pages/citizen/PropertyDetail.jsx";
import { AssociatedProperties } from "./pages/citizen/AssociatedProperties.jsx";
import { Purchases } from "./pages/citizen/Purchases.jsx";
import { Transfers } from "./pages/citizen/Transfers.jsx";
import { TransferDetail } from "./pages/citizen/TransferDetail.jsx";
import { SellKeys } from "./pages/citizen/SellKeys.jsx";
import { Succession } from "./pages/citizen/Succession.jsx";
import { KeyRecovery } from "./pages/citizen/KeyRecovery.jsx";
import { Notifications } from "./pages/citizen/Notifications.jsx";
import { Account } from "./pages/citizen/Account.jsx";

// Registrar Portal Pages
import { RegistrarDashboard } from "./pages/registrar/Dashboard.jsx";
import { Queue } from "./pages/registrar/Queue.jsx";
import { TransferDesk } from "./pages/registrar/TransferDesk.jsx";
import { TransferVerify } from "./pages/registrar/TransferVerify.jsx";
import { ParcelRegister } from "./pages/registrar/ParcelRegister.jsx";
import { SuccessionDesk } from "./pages/registrar/SuccessionDesk.jsx";
import { RiskReview } from "./pages/registrar/RiskReview.jsx";
import { Overrides } from "./pages/registrar/Overrides.jsx";
import { FrozenParcels } from "./pages/registrar/FrozenParcels.jsx";
import { AuditLog } from "./pages/registrar/AuditLog.jsx";
import { RegistrarAccount } from "./pages/registrar/RegistrarAccount.jsx";

// Auditor Portal Pages
import { AuditorDashboard } from "./pages/auditor/AuditorDashboard.jsx";
import { AuditorEvents } from "./pages/auditor/AuditorEvents.jsx";
import { AuditorTransfers } from "./pages/auditor/AuditorTransfers.jsx";
import { AuditorParcels } from "./pages/auditor/AuditorParcels.jsx";
import { AuditorOverrides } from "./pages/auditor/AuditorOverrides.jsx";
import { AuditorFrozen } from "./pages/auditor/AuditorFrozen.jsx";
import { AuditorBlockchain } from "./pages/auditor/AuditorBlockchain.jsx";
import { AuditorReports } from "./pages/auditor/AuditorReports.jsx";
import { AuditorAccount } from "./pages/auditor/AuditorAccount.jsx";

// Bank Portal Pages
import { BankDashboard } from "./pages/bank/BankDashboard.jsx";
import { BankTitleChecks } from "./pages/bank/BankTitleChecks.jsx";
import { BankMortgages } from "./pages/bank/BankMortgages.jsx";
import { BankBlockedCases } from "./pages/bank/BankBlockedCases.jsx";
import { BankReports } from "./pages/bank/BankReports.jsx";
import { BankAccount } from "./pages/bank/BankAccount.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* ==================================================== */}
        {/* 1. PUBLIC ROUTES (No Login Required)                */}
        {/* ==================================================== */}
        <Route path="/" element={<ExplorerPage />} />
        <Route path="/explore" element={<ExplorerPage />} />
        <Route path="/parcel/:ulpin" element={<ExplorerPage />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/workflow" element={<WorkflowPage />} />

        {/* Auth Routes */}
        <Route path="/auth/citizen" element={<CitizenAuth />} />
        <Route path="/auth/registrar" element={<RegistrarAuth />} />
        <Route path="/auth/auditor" element={<AuditorAuth />} />
        <Route path="/auth/bank" element={<BankAuth />} />

        {/* System Error Pages */}
        <Route path="/403" element={<AccessDenied />} />
        <Route path="/unauthorized" element={<AccessDenied />} />
        <Route path="/404" element={<NotFound />} />

        {/* ==================================================== */}
        {/* 2. PROTECTED CITIZEN ROUTES                          */}
        {/* ==================================================== */}
        <Route
          path="/citizen"
          element={
            <ProtectedRoute portal="citizen">
              <Navigate to="/citizen/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/dashboard"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <CitizenDashboard />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/my-properties"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <MyProperty />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/my-property"
          element={<Navigate to="/citizen/my-properties" replace />}
        />
        <Route
          path="/citizen/properties"
          element={<Navigate to="/citizen/my-properties" replace />}
        />
        <Route
          path="/citizen/properties/:ulpin"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <PropertyDetail />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/property/:ulpin"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <PropertyDetail />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/associated-properties"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <AssociatedProperties />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/purchases"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <Purchases />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/transfers"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <Transfers />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/transfers/:requestId"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <TransferDetail />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/sell-keys"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <SellKeys />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/sell-keys/:keyId"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <SellKeys />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/succession"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <Succession />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/key-recovery"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <KeyRecovery />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/notifications"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <Notifications />
              </CitizenShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/account"
          element={
            <ProtectedRoute portal="citizen">
              <CitizenShell>
                <Account />
              </CitizenShell>
            </ProtectedRoute>
          }
        />

        {/* ==================================================== */}
        {/* 3. PROTECTED REGISTRAR ROUTES                        */}
        {/* ==================================================== */}
        <Route
          path="/registrar"
          element={
            <ProtectedRoute portal="registrar">
              <Navigate to="/registrar/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/dashboard"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <RegistrarDashboard />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/transfers"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <Queue />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/queue"
          element={<Navigate to="/registrar/transfers" replace />}
        />
        <Route
          path="/registrar/transfers/:requestId"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <TransferDesk />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/transfer-desk"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <TransferDesk />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/transfers/:requestId/verify"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <TransferVerify />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/parcels"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <ParcelRegister />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/parcels/:ulpin"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <ParcelRegister />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/succession"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <SuccessionDesk />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/succession/:caseId"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <SuccessionDesk />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/risk-review"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <RiskReview />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/overrides"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <Overrides />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/frozen-parcels"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <FrozenParcels />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/audit"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <AuditLog />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/account"
          element={
            <ProtectedRoute portal="registrar">
              <RegistrarShell>
                <RegistrarAccount />
              </RegistrarShell>
            </ProtectedRoute>
          }
        />

        {/* ==================================================== */}
        {/* 4. PROTECTED AUDITOR ROUTES                          */}
        {/* ==================================================== */}
        <Route
          path="/auditor"
          element={
            <ProtectedRoute portal="auditor">
              <Navigate to="/auditor/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/dashboard"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorDashboard />
              </AuditorShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/events"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorEvents />
              </AuditorShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/events/:eventId"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorEvents />
              </AuditorShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/transfers"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorTransfers />
              </AuditorShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/transfers/:requestId"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorTransfers />
              </AuditorShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/parcels"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorParcels />
              </AuditorShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/parcels/:ulpin"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorParcels />
              </AuditorShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/overrides"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorOverrides />
              </AuditorShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/frozen-parcels"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorFrozen />
              </AuditorShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/blockchain"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorBlockchain />
              </AuditorShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/reports"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorReports />
              </AuditorShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/account"
          element={
            <ProtectedRoute portal="auditor">
              <AuditorShell>
                <AuditorAccount />
              </AuditorShell>
            </ProtectedRoute>
          }
        />

        {/* ==================================================== */}
        {/* 5. PROTECTED BANK ROUTES                             */}
        {/* ==================================================== */}
        <Route
          path="/bank"
          element={
            <ProtectedRoute portal="bank">
              <Navigate to="/bank/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bank/dashboard"
          element={
            <ProtectedRoute portal="bank">
              <BankShell>
                <BankDashboard />
              </BankShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bank/title-checks"
          element={
            <ProtectedRoute portal="bank">
              <BankShell>
                <BankTitleChecks />
              </BankShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bank/parcels/:ulpin"
          element={
            <ProtectedRoute portal="bank">
              <BankShell>
                <BankTitleChecks />
              </BankShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bank/mortgages"
          element={
            <ProtectedRoute portal="bank">
              <BankShell>
                <BankMortgages />
              </BankShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bank/blocked-cases"
          element={
            <ProtectedRoute portal="bank">
              <BankShell>
                <BankBlockedCases />
              </BankShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bank/reports"
          element={
            <ProtectedRoute portal="bank">
              <BankShell>
                <BankReports />
              </BankShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bank/account"
          element={
            <ProtectedRoute portal="bank">
              <BankShell>
                <BankAccount />
              </BankShell>
            </ProtectedRoute>
          }
        />

        {/* ==================================================== */}
        {/* 6. FALLBACK (404 Not Found)                          */}
        {/* ==================================================== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
