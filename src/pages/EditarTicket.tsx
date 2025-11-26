import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ResponsiveSelect from "@/components/ui/responsive-select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTickets, type Ticket as StoreTicket, type TicketStatus } from "@/hooks/use-tickets";
import { addTicketMessage, getTicketByNumber, updateTicketStatusByNumber } from "@/lib/tickets";
import { maskUserIdentifier } from "@/lib/user-display";
import { useAuth } from "@/hooks/use-auth-hook";

type Ticket = StoreTicket;

const statusColors: Record<TicketStatus, string> = {
  Aberto: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  "Em Andamento": "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  Pendente: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
  "Aguardando Cliente": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  "Aguardando Agente": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400",
  Resolvido: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  Fechado: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
  Cancelado: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
};

const priorityColors: Record<Ticket["prioridade"], string> = {
  Crítica: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  Alta: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  Média: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
  Baixa: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
};

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  Aberto: ["Em Andamento", "Resolvido", "Cancelado"],
  "Em Andamento": ["Aguardando Cliente", "Aguardando Agente", "Resolvido", "Cancelado"],
  Pendente: ["Em Andamento", "Resolvido", "Cancelado"],
  "Aguardando Cliente": ["Em Andamento", "Resolvido", "Cancelado"],
  "Aguardando Agente": ["Em Andamento", "Resolvido", "Cancelado"],
  Resolvido: ["Fechado", "Em Andamento", "Cancelado"],
  Fechado: ["Cancelado"],
  Cancelado: [],
};

const STATUS_ORDER: TicketStatus[] = [
  "Aberto",
  "Em Andamento",
  "Pendente",
  "Aguardando Cliente",
  "Aguardando Agente",
  "Resolvido",
  "Fechado",
  "Cancelado",
];

const QUICK_ACTION_ORDER: TicketStatus[] = [
  "Em Andamento",
  "Aguardando Cliente",
  "Aguardando Agente",
  "Resolvido",
  "Fechado",
  "Cancelado",
];

const ACTION_LABELS: Record<TicketStatus, string> = {
  Aberto: "Reabrir como Aberto",
  "Em Andamento": "Mover para Em Andamento",
  Pendente: "Marcar como Pendente",
  "Aguardando Cliente": "Aguardar resposta do cliente",
  "Aguardando Agente": "Aguardar equipe de suporte",
  Resolvido: "Marcar como Resolvido",
  Fechado: "Encerrar chamado",
  Cancelado: "Cancelar chamado",
};

const ACTION_VARIANT: Record<TicketStatus, "default" | "secondary" | "outline" | "destructive"> = {
  Aberto: "secondary",
  "Em Andamento": "secondary",
  Pendente: "secondary",
  "Aguardando Cliente": "outline",
  "Aguardando Agente": "outline",
  Resolvido: "default",
  Fechado: "default",
  Cancelado: "destructive",
};

export default function EditarTicket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tickets, updateTicket, upsertTicketDetail } = useTickets();
  const { user: authUser } = useAuth();
  const ticket = useMemo(() => tickets.find((t) => t.id === id), [tickets, id]);
  const [status, setStatus] = useState<TicketStatus | undefined>(ticket?.status);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [comment, setComment] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (ticket?.status) setStatus(ticket.status);
  }, [ticket?.status]);

  const rawRole = authUser?.userType;
  const normalizedRole =
    typeof rawRole === "string" ? rawRole.toLowerCase() : String(rawRole ?? "").toLowerCase();
  const isCustomer = normalizedRole === "customer" || normalizedRole === "1";
  const canInternal = normalizedRole === "admin" || normalizedRole === "agent";

  function formatDatePtBr(iso: string | undefined) {
    if (!iso) return "-";
    try {
      const [y, m, d] = iso.slice(0, 10).split("-").map((value) => parseInt(value, 10));
      if (!y || !m || !d) return "-";
      return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    } catch {
      return "-";
    }
  }

  useEffect(() => {
    if (id && (!ticket || !ticket.hasFullDetail || !ticket.descricao?.trim())) {
      setLoading(true);
      getTicketByNumber(id, upsertTicketDetail).finally(() => setLoading(false));
    }
  }, [ticket, id, upsertTicketDetail]);

  const applyStatusChange = async (targetStatus: TicketStatus) => {
    if (!id || !ticket) return;
    if (targetStatus === ticket.status) {
      toast({ title: "Nada a alterar", description: "O status selecionado já está aplicado." });
      return;
    }
    try {
      setUpdatingStatus(true);
      await updateTicketStatusByNumber(id, targetStatus);
      updateTicket(id, { status: targetStatus });
      setStatus(targetStatus);
      toast({ title: "Chamado atualizado", description: `Status alterado para ${targetStatus}.` });
    } catch {
      toast({
        title: "Falha ao atualizar",
        description: "Não foi possível salvar o novo status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSalvar = async () => {
    if (!status) return;
    await applyStatusChange(status);
  };

  const handlePostComment = async () => {
    if (!ticket?.dbId || !comment.trim()) return;
    try {
      setPosting(true);
      await addTicketMessage(ticket.dbId, comment.trim(), { isInternal: internalNote && canInternal });
      updateTicket(ticket.id, { dataAtualizacao: new Date().toISOString() });
      setComment("");
      setInternalNote(false);
      toast({
        title: "Comentário adicionado",
        description: internalNote ? "Nota interna registrada." : "Comentário publicado.",
      });
    } catch {
      toast({
        title: "Falha ao comentar",
        description: "Não foi possível adicionar o comentário.",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  const selectOptions = useMemo(() => {
    if (!ticket || isCustomer) return [] as Array<{ value: TicketStatus; label: string }>;
    const baseTransitions = STATUS_TRANSITIONS[ticket.status] ?? [];
    const allowed = new Set<TicketStatus>([ticket.status, ...baseTransitions]);
    return STATUS_ORDER.filter((value) => allowed.has(value)).map((value) => ({ value, label: value }));
  }, [ticket, isCustomer]);

  const quickActions = useMemo(() => {
    if (!ticket) return [] as TicketStatus[];
    if (isCustomer) {
      return ticket.status === "Cancelado" ? [] : (["Cancelado"] as TicketStatus[]);
    }
    const allowed = STATUS_TRANSITIONS[ticket.status] ?? [];
    return QUICK_ACTION_ORDER.filter(
      (statusTarget) => allowed.includes(statusTarget) && statusTarget !== ticket.status,
    );
  }, [ticket, isCustomer]);

  const currentStatus = (status ?? ticket?.status ?? "Aberto") as TicketStatus;
  const statusBadgeClass = statusColors[currentStatus] ?? "bg-muted text-muted-foreground";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/meus-tickets")} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold">Ticket #{ticket?.id ?? id}</CardTitle>
          <CardDescription>Altere o status, resolva o chamado e registre atualizações.</CardDescription>
        </div>
      </div>

      {!ticket ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">{loading ? "Carregando chamado..." : "Chamado não encontrado."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo do chamado</CardTitle>
              <CardDescription>Informações principais para decidir o próximo passo.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <p className="text-lg font-semibold leading-tight">{ticket.titulo}</p>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {loading ? "Carregando detalhes..." : ticket.descricao || "Nenhuma descrição disponível."}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Departamento</Label>
                    <p className="text-sm text-muted-foreground">{ticket.departamento || "Não informado"}</p>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <p className="text-sm text-muted-foreground">{ticket.categoria || "Não informada"}</p>
                  </div>
                  <div>
                    <Label>Subcategoria</Label>
                    <p className="text-sm text-muted-foreground">{ticket.subcategoria || "Não informada"}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Prioridade</Label>
                    <Badge className={priorityColors[ticket.prioridade]}>{ticket.prioridade}</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusBadgeClass}>{currentStatus}</Badge>
                  <Badge variant="secondary" className={priorityColors[ticket.prioridade]}>
                    {ticket.prioridade}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Protocolo</Label>
                    <p className="text-sm text-muted-foreground">{ticket.id}</p>
                  </div>
                  <div>
                    <Label>Solicitante</Label>
                    <p className="text-sm text-muted-foreground">{maskUserIdentifier(ticket.usuario)}</p>
                  </div>
                  <div>
                    <Label>Data de abertura</Label>
                    <p className="text-sm text-muted-foreground">{formatDatePtBr(ticket.dataCriacao)}</p>
                  </div>
                  <div>
                    <Label>Última atualização</Label>
                    <p className="text-sm text-muted-foreground">{formatDatePtBr(ticket.dataAtualizacao)}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900 rounded-md p-3">
                  Técnicos e administradores podem assumir o chamado, mover para "Em Andamento" e finalizar como
                  "Resolvido" ou "Fechado" conforme o andamento.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status e ações</CardTitle>
              <CardDescription>Controle o fluxo do ticket conforme sua responsabilidade.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status atual</Label>
                {isCustomer ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Clientes podem apenas solicitar o cancelamento do chamado.
                    </p>
                    {ticket.status !== "Cancelado" && (
                      <Button variant="destructive" onClick={() => applyStatusChange("Cancelado")} disabled={updatingStatus}>
                        Cancelar chamado
                      </Button>
                    )}
                  </div>
                ) : (
                  <ResponsiveSelect
                    value={status}
                    onChange={(value) => setStatus(value as TicketStatus)}
                    options={selectOptions}
                    placeholder="Selecione o próximo status"
                    title="Selecione o status do chamado"
                    ariaLabel="Status do chamado"
                    className="max-w-md"
                    triggerClassName="justify-between"
                  />
                )}
              </div>

              {!isCustomer && quickActions.length > 0 && (
                <div className="space-y-2">
                  <Label>Ações rápidas</Label>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((target) => (
                      <Button
                        key={target}
                        variant={ACTION_VARIANT[target]}
                        onClick={() => applyStatusChange(target)}
                        disabled={updatingStatus}
                      >
                        {ACTION_LABELS[target]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {!isCustomer && (
                <div className="flex justify-end">
                  <Button onClick={handleSalvar} disabled={updatingStatus || !status} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Salvar alterações
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adicionar comentário</CardTitle>
              <CardDescription>
                Registre uma atualização pública ou, se for agente/administrador, marque como nota interna.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Comentário</Label>
                <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} placeholder="Descreva o andamento do chamado" />
              </div>
              {canInternal && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={internalNote} onChange={(event) => setInternalNote(event.target.checked)} />
                  <span>Nota interna (visível apenas para agentes e administradores)</span>
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handlePostComment} disabled={posting || !comment.trim()}>
                  {posting ? "Enviando..." : "Enviar comentário"}
                </Button>
                <Button variant="outline" onClick={() => setComment("")} disabled={!comment.trim()}>
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
