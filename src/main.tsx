import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Amplify } from "aws-amplify";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { PlatformAdminLogin } from "./pages/PlatformAdminLogin";
import { PlatformAdminLayout } from "./pages/PlatformAdminLayout";
import { PlatformAdminDashboard } from "./pages/PlatformAdminDashboard";
import { PlatformAdminUsers } from "./pages/PlatformAdminUsers";
import { PlatformAdminTenants } from "./pages/PlatformAdminTenants";
import { PlatformAdminSettings } from "./pages/PlatformAdminSettings";
import "./index.css";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId:       import.meta.env.VITE_COGNITO_USER_POOL_ID   ?? "",
      userPoolClientId: import.meta.env.VITE_COGNITO_APP_CLIENT_ID  ?? "",
      loginWith: { email: true },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<PlatformAdminLogin />} />
          <Route path="/" element={<AdminProtectedRoute><PlatformAdminLayout /></AdminProtectedRoute>}>
            <Route index element={<PlatformAdminDashboard />} />
            <Route path="users" element={<PlatformAdminUsers />} />
            <Route path="tenants" element={<PlatformAdminTenants />} />
            <Route path="settings" element={<PlatformAdminSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  </React.StrictMode>,
)
