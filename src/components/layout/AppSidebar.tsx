/**
 * Barra lateral de navegação do app.
 *
 * Exibe itens principais para todos e um grupo administrativo quando o usuário é admin.
 * Determinação de admin: user.userType === 'admin' (case-insensitive) ou '3'.
 */
import {
  TicketPlus,
  LayoutDashboard,
  HelpCircle,
  FileText,
  Users,
  BarChart3,
  Ticket
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth-hook";
import { BrandLogo } from "@/components/ui/brand-logo";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/** Itens disponíveis para todos os usuários */
const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Novo Ticket", url: "/novo-ticket", icon: TicketPlus },
  { title: "Meus Tickets", url: "/meus-tickets", icon: FileText },
  { title: "Todos Chamados", url: "/todos-chamados", icon: Ticket },
  { title: "FAQ", url: "/faq", icon: HelpCircle },
];

/** Itens exclusivos para administradores */
const adminItems = [
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Usuários", url: "/usuarios", icon: Users },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, loading: authLoading } = useAuth();
  const rawType = user?.userType;
  const normalizedType = typeof rawType === "string" ? rawType.toLowerCase() : String(rawType ?? "").toLowerCase();
  const isAdmin = normalizedType === "admin" || normalizedType === "3";
  const isAgent = normalizedType === "agent" || normalizedType === "2";
  const isStaff = isAdmin || isAgent;
  const isAgentOnly = isAgent && !isAdmin;

  const isActive = (path: string) => currentPath === path;

  /** Define classes de estilo conforme estado ativo/inativo */
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-primary text-primary-foreground font-medium shadow-sm"
      : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors";

  return (
    <Sidebar className="border-r bg-card">
      <SidebarContent className="p-4">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo className="h-8 w-8 text-primary" title="ZenTicket" />
          <div>
            <h2 className="font-bold text-lg text-primary">ZenTicket</h2>
            <p className="text-xs text-muted-foreground">Suporte sem atrito</p>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems
                .filter((item) => {
                  if (item.url === "/todos-chamados") return isStaff;
                  if (item.url === "/novo-ticket") return !isAgentOnly;
                  return true;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${getNavCls({ isActive })}`}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!authLoading && isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${getNavCls({ isActive })}`}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}