import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Route, Routes, Outlet, useNavigate, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Toaster as Sonner, toast } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./components/ThemeProvider";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import CreateTestimonial from "./pages/CreateTestimonial";
import BatchProcess from "./pages/BatchProcess";
import WallOfLove from "./pages/WallOfLove";
import HistoryPage from "./pages/HistoryPage";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import { AuthInitializer } from "./components/AuthInitializer";
import { SessionValidator } from "./components/SessionValidator";
import { SingleTabEnforcer } from "./components/SingleTabEnforcer";
import { useAuthStore } from "./store/authStore";

import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      // Aggressive padding: push multiple states to intercept rapid double-clicks.
      // This ensures that even if the user clicks back twice before JS executes,
      // they only land on another of our dummy states, never the external Google OAuth page.
      window.history.pushState(null, '', window.location.href);
      window.history.pushState(null, '', window.location.href);
      window.history.pushState(null, '', window.location.href);
      
      const handlePopState = () => {
        // Replenish the padding
        window.history.pushState(null, '', window.location.href);
        toast.info("You are securely logged in.", {
          description: "Please use the in-app navigation menu.",
          duration: 2000,
          id: 'back-lock-toast'
        });
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isAuthenticated]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner closeButton />
          <SingleTabEnforcer />
          <SessionValidator />
          <AuthInitializer />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout><Outlet /></Layout>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/create" element={<CreateTestimonial />} />
                <Route path="/batch" element={<BatchProcess />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/wall" element={<WallOfLove />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
