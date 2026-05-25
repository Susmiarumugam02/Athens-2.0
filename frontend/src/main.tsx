/* eslint-disable react-refresh/only-export-components */
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "@/styles/sap/enable-sap.css";
import "./styles/compact-kpi.css";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { AppRouter } from "./lib/router";
import { Toaster } from "sonner";
import { useAuthStore } from "./store/authStore";
import { useThemeStore } from "./store/themeStore";
import NotificationsContext from "./common/contexts/NotificationsContext";
import api from "./lib/api";
import ErrorBoundary from "./components/ErrorBoundary";
import DevelopmentBanner from "./components/DevelopmentBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Optional rollback to Athens styles
if (import.meta.env.VITE_USE_ATHENS_STYLES === 'true') {
  import('./index.css');
}

async function sendNotification(
  userId: number,
  payload: { title: string; message: string; type: string; data?: Record<string, unknown> }
): Promise<void> {
  await api.post('/api/notifications/create/', {
    user_id: userId,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    data: payload.data || {},
  });
}

function AppWrapper() {
  const { initializeAuth } = useAuthStore();
  const themeMode = useThemeStore((state) => state.mode);
  const [systemDark, setSystemDark] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const isDarkTheme = themeMode === 'dark' || (themeMode === 'system' && systemDark);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <NotificationsContext.Provider value={{ sendNotification }}>
      <DevelopmentBanner />
      <ConfigProvider
        theme={{
          algorithm: isDarkTheme ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            colorBgBase: isDarkTheme ? '#0b1120' : '#ffffff',
            colorTextBase: isDarkTheme ? '#f8fafc' : '#020817',
            colorBgContainer: isDarkTheme ? '#1e293b' : '#ffffff',
            colorBgElevated: isDarkTheme ? '#1e293b' : '#ffffff',
            colorBorder: isDarkTheme ? '#1e293b' : '#e2e8f0',
            colorTextPlaceholder: isDarkTheme ? '#94a3b8' : '#64748b',
            colorFillSecondary: isDarkTheme ? '#1e293b' : '#f1f5f9',
            colorFillTertiary: isDarkTheme ? '#334155' : '#f8fafc',
            borderRadius: 8,
            fontSize: 14,
            zIndexPopupBase: 7000,
          },
        }}
      >
        <AppRouter />
        <Toaster position="top-right" richColors />
      </ConfigProvider>
    </NotificationsContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppWrapper />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
