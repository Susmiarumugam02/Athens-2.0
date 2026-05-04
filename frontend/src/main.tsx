import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "@/styles/sap/enable-sap.css";
import "./styles/compact-kpi.css";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { AppRouter } from "./lib/router";
import { Toaster } from "sonner";
import { useAuthStore } from "./store/authStore";

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

function AppWrapper() {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [])

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
          fontSize: 14,
        },
      }}
    >
      <AppRouter />
      <Toaster position="top-right" richColors />
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppWrapper />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
