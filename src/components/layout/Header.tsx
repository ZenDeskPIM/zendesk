/**
 * Cabeçalho do app (sticky) com breadcrumbs, notificações, tema e menu do usuário.
 *
 * Responsabilidades
 * - Breadcrumbs baseados na rota atual.
 * - Indicadores de notificação (simulados) com marcação de lidos.
 * - Alternância de tema (claro/escuro) via next-themes.
 * - Ações de usuário (perfil, configurações, sair).
 */
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Bell, User, Settings, LogOut, Home, HelpCircle, AlertCircle, Clock, CheckCircle, Moon, Sun } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useAuth } from "@/hooks/use-auth-hook";
import { BrandLogo } from "@/components/ui/brand-logo";

/** Mapeamento simples de path -> nome de rota para breadcrumbs */
const routeNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/novo-ticket': 'Novo Ticket',
  '/meus-tickets': 'Meus Tickets',
  '/todos-chamados': 'Todos Chamados',
  '/relatorios': 'Relatórios',
  '/faq': 'FAQ',
  '/usuarios': 'Usuários',
  '/perfil': 'Perfil',
  '/configuracoes': 'Configurações'
};

export function Header() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [storedNotifications, setStoredNotifications] = useLocalStorage(
    "notifications",
    [
      {
        id: 1,
        title: "Novo ticket criado",
        message: "Ticket #1234 foi criado por João Silva",
        time: "2 min atrás",
        read: false,
        type: "new",
        priority: "high"
      },
      {
        id: 2,
        title: "Ticket atualizado",
        message: "Status do ticket #1230 alterado para Em Andamento",
        time: "15 min atrás",
        read: false,
        type: "update",
        priority: "medium"
      },
      {
        id: 3,
        title: "Ticket crítico aguardando",
        message: "Ticket #1235 de prioridade crítica aguarda atendimento há 1 hora",
        time: "1 hora atrás",
        read: false,
        type: "critical",
        priority: "critical"
      },
      {
        id: 4,
        title: "Ticket finalizado",
        message: "Ticket #1225 foi finalizado com sucesso",
        time: "2 horas atrás",
        read: true,
        type: "completed",
        priority: "low"
      }
    ]
  )
  const [notifications, setNotifications] = useState(storedNotifications)

  // keep local state in sync with storage changes (e.g. across tabs)
  useEffect(() => {
    setNotifications(storedNotifications)
  }, [storedNotifications])

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalNotifications = notifications.filter(n => n.priority === 'critical' && !n.read);
  const currentRouteName = routeNames[location.pathname] || 'Página não encontrada';

  /** Retorna uma lista de breadcrumbs com base no pathname atual */
  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Dashboard', path: '/dashboard' }];

    if (pathSegments.length > 0 && location.pathname !== '/dashboard') {
      breadcrumbs.push({ name: currentRouteName, path: location.pathname });
    }

    return breadcrumbs;
  };

  /** Marca uma notificação como lida e persiste */
  const markAsRead = (id: number) => {
    setNotifications(prev => {
      const updated = prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
      setStoredNotifications(updated)
      return updated
    });
  };

  /** Marca todas as notificações como lidas e persiste */
  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(notification => ({ ...notification, read: true }))
      setStoredNotifications(updated)
      return updated
    });
  };

  /** Obtém iniciais a partir de nome ou email (fallback de avatar) */
  const getInitials = (nameOrEmail?: string) => {
    if (!nameOrEmail) return "US";
    if (nameOrEmail.includes("@")) return nameOrEmail.split("@")[0].slice(0, 2).toUpperCase();
    const parts = nameOrEmail.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  /** Realiza logout e navega para a tela de login */
  const handleLogout = () => {
    logout();
    toast({
      title: "Logout realizado com sucesso",
      description: "Você foi desconectado do sistema com segurança.",
    });
    navigate('/login');
  };

  return (
    <TooltipProvider>
      <header className="h-12 md:h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 header-safe">
        <div className="flex h-full items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <SidebarTrigger className="h-8 w-8 flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <BrandLogo className="h-6 w-6 flex-shrink-0 text-primary" title="ZenTicket" />
              <div className="font-semibold text-primary text-sm md:text-base truncate">ZenTicket</div>
              <div className="text-xs md:text-sm text-muted-foreground hidden sm:block">v1.0</div>
            </div>

            {/* Breadcrumb Navigation - Heurística 1: Visibilidade do status do sistema */}
            <Breadcrumb className="hidden lg:flex ml-4">
              <BreadcrumbList>
                {getBreadcrumbs().map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {index === getBreadcrumbs().length - 1 ? (
                        <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          onClick={() => navigate(crumb.path)}
                          className="cursor-pointer hover:text-primary"
                        >
                          {crumb.name}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="h-8 w-8 md:h-10 md:w-10"
                  aria-label="Alternar tema"
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Alternar tema</p>
              </TooltipContent>
            </Tooltip>
            {/* Help Button - Heurística 10: Ajuda e documentação */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/faq')}
                  className="hidden sm:flex h-8 w-8 md:h-10 md:w-10"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ajuda e FAQ</p>
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="Menu do usuário">
                  <Avatar className="h-8 w-8">
                    {/* If you add avatar URL to user later, render <AvatarImage src={user.avatarUrl} alt={user.name} /> */}
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user?.name || user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-popover backdrop-blur z-50 border shadow-lg" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || (user?.email?.split("@")[0] ?? "Usuário")}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email ?? "sem-email"}
                    </p>
                    <Badge variant="secondary" className="w-fit text-xs mt-1">
                      Logado
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/perfil')}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/configuracoes')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}