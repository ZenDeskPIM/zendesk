/**
 * Componente raiz da aplicação (SPA) que monta provedores globais:
 * - ThemeProvider: tema claro/escuro adaptativo.
 * - QueryClientProvider: cache e gerenciamento de requisições (react-query).
 * - AuthProvider: estado de autenticação e métodos login/logout.
 * - TooltipProvider / Toasters: feedback de UI e dicas.
 * - BrowserRouter + Routes: definição das rotas públicas/privadas.
 *
 * Rotas protegidas:
 * - PrivateRoute: exige usuário autenticado.
 * - AdminRoute: exige papel admin (userType === 'admin' | '3').
 */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Layout } from "./components/layout/Layout";
import { AuthProvider } from "./hooks/use-auth";
import { useAuth } from "./hooks/use-auth-hook";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NovoTicket from "./pages/NovoTicket";
import FAQ from "./pages/FAQ";
import Relatorios from "./pages/Relatorios";
import TodosChamados from "./pages/TodosChamados";
import PesquisarTickets from "./pages/PesquisarTickets";
import EditarTicket from "./pages/EditarTicket";
import VisualizarTicket from "./pages/VisualizarTicket";
import Usuarios from "./pages/Usuarios";
import Perfil from "./pages/Perfil";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/** Protege rota exigindo autenticação */
function PrivateRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/** Protege rota exigindo papel de administrador */
function AdminRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  const role = typeof user?.userType === "string" ? user?.userType : String(user?.userType ?? "");
  const isAdmin = role?.toString().toLowerCase() === "admin" || role === "3";
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
}

/** Limita acesso a colaboradores (agentes ou administradores) */
function StaffRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  const raw = user?.userType;
  const normalized = typeof raw === "string" ? raw.toLowerCase() : String(raw ?? "").toLowerCase();
  const isAgent = normalized === "agent" || normalized === "2";
  const isAdmin = normalized === "admin" || normalized === "3";
  return (isAgent || isAdmin) ? children : <Navigate to="/meus-tickets" replace />;
}

const RouterComponent = import.meta.env.MODE === "electron" || window.location.protocol === "file:" ? HashRouter : BrowserRouter;

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <RouterComponent>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/novo-ticket" element={
                <PrivateRoute>
                  <Layout>
                    <NovoTicket />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/meus-tickets" element={
                <PrivateRoute>
                  <Layout>
                    <PesquisarTickets />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/editar-ticket/:id" element={
                <PrivateRoute>
                  <Layout>
                    <EditarTicket />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/visualizar-ticket/:id" element={
                <PrivateRoute>
                  <Layout>
                    <VisualizarTicket />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/faq" element={
                <PrivateRoute>
                  <Layout>
                    <FAQ />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/relatorios" element={
                <PrivateRoute>
                  <Layout>
                    <Relatorios />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/todos-chamados" element={
                <PrivateRoute>
                  <StaffRoute>
                    <Layout>
                      <TodosChamados />
                    </Layout>
                  </StaffRoute>
                </PrivateRoute>
              } />
              <Route path="/usuarios" element={
                <PrivateRoute>
                  <AdminRoute>
                    <Layout>
                      <Usuarios />
                    </Layout>
                  </AdminRoute>
                </PrivateRoute>
              } />
              <Route path="/perfil" element={
                <PrivateRoute>
                  <Layout>
                    <Perfil />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/configuracoes" element={
                <PrivateRoute>
                  <Layout>
                    <Configuracoes />
                  </Layout>
                </PrivateRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={
                <PrivateRoute>
                  <Layout>
                    <NotFound />
                  </Layout>
                </PrivateRoute>
              } />
            </Routes>
          </RouterComponent>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
