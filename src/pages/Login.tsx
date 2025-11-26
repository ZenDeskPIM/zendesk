/**
 * Página de Login
 *
 * Responsabilidades
 * - Autenticar o usuário via `useAuth().login(email, password)`.
 * - Disponibilizar uma simulação simples de redefinição de senha (apenas UI, sem backend).
 * - Exibir toasts contextuais para sucesso/erro.
 * - Manter inputs acessíveis (labels e ícones apropriados).
 *
 * Observações
 * - O fluxo real de redefinição deve substituir a simulação atual (timeout do resetSent).
 * - Após login bem-sucedido, navega para /dashboard.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth-hook";
import { BrandLogo } from "@/components/ui/brand-logo";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetName, setResetName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  /** Tenta autenticar; mostra toast e navega em caso de sucesso */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    const ok = await login(email, password);
    if (ok) {
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao ZenTicket",
      });
      navigate('/dashboard');
    } else {
      toast({
        title: "Falha ao entrar",
        description: "Verifique suas credenciais",
        variant: "destructive",
      });
    }
  };

  /** Submissão simulada de redefinição de senha (placeholder) */
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();

    // Simular envio de email de reset
    setResetSent(true);

    // Resetar formulário após 3 segundos
    setTimeout(() => {
      setResetSent(false);
      setShowForgotPassword(false);
      setResetName("");
      setResetEmail("");
    }, 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-3 md:p-4">
      <Card className="w-full max-w-sm md:max-w-md">
        <CardHeader className="text-center space-y-4 p-4 md:p-6">
          <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <BrandLogo className="h-7 w-7 md:h-8 md:w-8 text-primary" title="ZenTicket" />
          </div>
          <div>
            <CardTitle className="text-xl md:text-2xl font-bold">ZenTicket</CardTitle>
            <CardDescription className="text-sm md:text-base text-muted-foreground">
              Faça login para acessar o seu hub de suporte
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {!showForgotPassword ? (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                >
                  Entrar
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Esqueci a senha
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Redefinição de senha</h3>
              <p className="text-sm text-muted-foreground">
                Fale com o superior responsável do seu departamento para receber uma nova senha.
              </p>
              <Button
                type="button"
                variant="link"
                onClick={() => setShowForgotPassword(false)}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Voltar ao login
              </Button>
            </div>
          )}

          <div className="mt-4 md:mt-6 text-center text-xs md:text-sm text-muted-foreground">
            <p>Sistema de Gerenciamento de Tickets</p>
            <p className="text-xs mt-1">v1.0 - Acesso Administrativo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}