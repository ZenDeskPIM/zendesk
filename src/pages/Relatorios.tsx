/**
 * Página: Relatorios
 *
 * Responsabilidades:
 * - Exibir métricas agregadas (mock) de tickets por período e por setor/prioridade.
 * - Persistir preferências de período/aba/setor em localStorage (useLocalStorage) para experiência contínua.
 * - Calcular status de SLA dos tickets carregados do store (useTickets).
 * - Listar próximos atendimentos ordenados pelo vencimento do SLA (priorização operacional).
 * - Tabela completa de tickets filtrada por setor, com indicação textual de SLA.
 */
import { useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Download,
  Ticket,
  User,
  Timer
} from "lucide-react";
import { useTickets } from "@/hooks/use-tickets";
import { getReportsSummary, type ReportsSummary, type ReportsPeriod } from "@/lib/reports";
import { listTickets } from "@/lib/tickets";
import { Skeleton } from "@/components/ui/skeleton";
import { utils, writeFileXLSX } from "xlsx";

const departmentColors = [
  "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]",
  "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]",
  "bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.3)]",
  "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]",
];

const priorityColorsSoft = {
  Crítica: "bg-[hsl(var(--critical-bg))] text-[hsl(var(--critical))] border-[hsl(var(--critical))/0.3]",
  Alta: "bg-[hsl(var(--high-bg))] text-[hsl(var(--high))] border-[hsl(var(--high))/0.3]",
  Média: "bg-[hsl(var(--medium-bg))] text-[hsl(var(--medium))] border-[hsl(var(--medium))/0.3]",
  Baixa: "bg-[hsl(var(--low-bg))] text-[hsl(var(--low))] border-[hsl(var(--low))/0.3]",
} as const;

export default function Relatorios() {
  const [selectedPeriod, setSelectedPeriod] = useLocalStorage("relatorios:selectedPeriod", "mensal");
  const [selectedDepartment, setSelectedDepartment] = useLocalStorage("relatorios:selectedDepartment", "todos");
  const [activeTab, setActiveTab] = useLocalStorage("relatorios:activeTab", "relatorios");
  const { tickets, replaceAll } = useTickets();

  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getReportsSummary(selectedPeriod as ReportsPeriod);
        if (!ignore) setSummary(data);
      } catch {
        if (!ignore) setError("Falha ao carregar relatório");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    const id = setInterval(load, 120_000);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, [selectedPeriod]);

  // Sincroniza lista de tickets do backend para alimentar seções por status
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listTickets({ page: 1, pageSize: 500 });
        if (!cancelled) replaceAll(res.items);
      } catch {
        // Falha silenciosa; métricas de summary continuam funcionando
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [replaceAll]);

  const filteredSummary = (() => {
    if (!summary && tickets.length > 0) {
      const now = new Date();
      const periodStart = (() => {
        switch (selectedPeriod) {
          case "semanal":
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          case "trimestral":
            return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          default:
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
      })();
      const inWindow = tickets.filter((t) => new Date(t.dataCriacao) >= periodStart);
      return buildLocalSummary(inWindow);
    }
    if (!summary) return null;

    const haveOnlyZeros =
      summary.totalTickets === 0 &&
      summary.resolved === 0 &&
      summary.pending === 0 &&
      tickets.length > 0;

    let base: ReportsSummary = summary;
    if (haveOnlyZeros) {
      const now = new Date();
      const periodStart = (() => {
        switch (selectedPeriod) {
          case "semanal":
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          case "trimestral":
            return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          default:
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
      })();
      const inWindow = tickets.filter((t) => new Date(t.dataCriacao) >= periodStart);
      base = buildLocalSummary(inWindow, summary.period);
    }

    if (selectedDepartment === "todos") return base;

    const deptNameMap: Record<string, string> = {
      ti: "T.I",
      financeiro: "Financeiro",
      rh: "RH",
      producao: "Produção",
    };
    const target = deptNameMap[selectedDepartment] ?? selectedDepartment;
    const deptCount = base.departments[target] ?? 0;
    const detailed = base.departmentsDetailed?.find((d) => d.department === target);
    return {
      ...base,
      totalTickets: deptCount,
      resolved: detailed?.resolved ?? Math.round(deptCount * 0.8),
      pending:
        detailed?.pending ?? Math.max(0, deptCount - (detailed?.resolved ?? Math.round(deptCount * 0.8))),
      departments: { [target]: deptCount },
    } as ReportsSummary;
  })();

  function buildLocalSummary(
    inWindow: typeof tickets,
    period: ReportsPeriod = selectedPeriod as ReportsPeriod
  ): ReportsSummary {
    const totalTickets = inWindow.length;
    const resolved = inWindow.filter((t) => t.status === "Resolvido" || t.status === "Fechado").length;
    const pending = totalTickets - resolved;
    const departments: Record<string, number> = {};
    const priorities: ReportsSummary["priorities"] = { Crítica: 0, Alta: 0, Média: 0, Baixa: 0 };

    inWindow.forEach((t) => {
      departments[t.departamento] = (departments[t.departamento] ?? 0) + 1;
      priorities[t.prioridade as keyof typeof priorities] = (priorities[t.prioridade as keyof typeof priorities] ?? 0) + 1;
    });
    return {
      period,
      totalTickets,
      resolved,
      pending,
      avgResolutionHours: null,
      departments,
      priorities,
      departmentsDetailed: Object.entries(departments).map(([department, total]) => ({
        department,
        total,
        resolved: inWindow.filter(
          (t) => t.departamento === department && (t.status === "Resolvido" || t.status === "Fechado")
        ).length,
        pending: inWindow.filter(
          (t) => t.departamento === department && !(t.status === "Resolvido" || t.status === "Fechado")
        ).length,
      })),
    };
  }

  const getFilteredTickets = () => {
    if (selectedDepartment === "todos") return tickets;
    const map: Record<string, string> = { ti: "T.I", financeiro: "Financeiro", rh: "RH", producao: "Produção" };
    const deptName = map[selectedDepartment as keyof typeof map];
    return tickets.filter((ticket) => ticket.departamento === deptName);
  };

  const getSlaStatus = (ticket: { slaVencimento?: string }) => {
    const now = new Date();
    if (!ticket.slaVencimento) {
      return {
        status: "Normal",
        color: "text-[hsl(var(--low))]",
        bgColor: "bg-card",
      };
    }
    const slaDeadline = new Date(ticket.slaVencimento);
    const hoursUntilSla = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSla < 0) {
      return {
        status: "Vencido",
        color: "text-[hsl(var(--critical))]",
        bgColor: "bg-card",
      };
    }
    if (hoursUntilSla < 2) {
      return {
        status: "Crítico",
        color: "text-[hsl(var(--high))]",
        bgColor: "bg-card",
      };
    }
    if (hoursUntilSla < 8) {
      return {
        status: "Atenção",
        color: "text-[hsl(var(--medium))]",
        bgColor: "bg-card",
      };
    }
    return {
      status: "Normal",
      color: "text-[hsl(var(--low))]",
      bgColor: "bg-card",
    };
  };

  const getNextTickets = () => {
    return getFilteredTickets()
      .filter((ticket) => ticket.status !== "Resolvido" && ticket.status !== "Fechado")
      .sort((a, b) => new Date(a.slaVencimento ?? 0).getTime() - new Date(b.slaVencimento ?? 0).getTime())
      .slice(0, 5);
  };

  const handleExportToExcel = () => {
    const exportTickets = selectedDepartment === "todos" ? tickets : getFilteredTickets();
    const summaryForExport =
      filteredSummary ?? (exportTickets.length > 0 ? buildLocalSummary(exportTickets) : null);

    if (!summaryForExport && exportTickets.length === 0) {
      console.warn("Sem dados para exportar");
      return;
    }

    const now = new Date();
    const workbook = utils.book_new();
    const periodLabels: Record<ReportsPeriod, string> = {
      semanal: "Últimos 7 dias",
      mensal: "Últimos 30 dias",
      trimestral: "Últimos 90 dias",
    };
    const departmentLabelMap: Record<string, string> = {
      todos: "Todos os departamentos",
      ti: "T.I",
      financeiro: "Financeiro",
      rh: "RH",
      producao: "Produção",
    };

    const selectedDepartmentLabel =
      departmentLabelMap[selectedDepartment] ?? selectedDepartment.toUpperCase();
    const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString("pt-BR") : "");
    const parseDate = (value?: string) => (value ? new Date(value) : null);
    const formatNumber = (value: number | null | undefined) => {
      if (value == null || Number.isNaN(value)) return "";
      return value.toFixed(1).replace(".", ",");
    };

    const statusCounts: Record<string, number> = {};
    const requesterStats = new Map<string, { count: number; last: Date }>();
    const slaBuckets: Record<"Vencido" | "Crítico" | "Atenção" | "Normal" | "Sem SLA", number> = {
      Vencido: 0,
      Crítico: 0,
      Atenção: 0,
      Normal: 0,
      "Sem SLA": 0,
    };

    let totalOpenHours = 0;
    let openCount = 0;
    let totalResolutionHours = 0;
    let resolvedCount = 0;
    let ticketsWithSla = 0;
    let ticketsWithinSla = 0;

    exportTickets.forEach((ticket) => {
      statusCounts[ticket.status] = (statusCounts[ticket.status] ?? 0) + 1;

      const slaInfo = getSlaStatus(ticket);
      if (!ticket.slaVencimento) {
        slaBuckets["Sem SLA"] += 1;
      } else {
        const bucketKey = slaInfo.status as keyof typeof slaBuckets;
        if (bucketKey in slaBuckets) slaBuckets[bucketKey] += 1;
        ticketsWithSla += 1;
        if (slaInfo.status === "Normal" || slaInfo.status === "Atenção") {
          ticketsWithinSla += 1;
        }
      }

      const createdAtIso =
        (ticket as { dataCriacao?: string }).dataCriacao ??
        (ticket as { criadoEm?: string }).criadoEm ??
        (ticket as { createdAt?: string }).createdAt;
      const updatedAtIso =
        (ticket as { dataAtualizacao?: string }).dataAtualizacao ??
        (ticket as { atualizadoEm?: string }).atualizadoEm ??
        createdAtIso;

      const createdAtDate = parseDate(createdAtIso);
      const updatedAtDate = parseDate(updatedAtIso);

      if (createdAtDate) {
        if (ticket.status === "Resolvido" || ticket.status === "Fechado") {
          if (updatedAtDate) {
            totalResolutionHours += (updatedAtDate.getTime() - createdAtDate.getTime()) / 3_600_000;
            resolvedCount += 1;
          }
        } else {
          totalOpenHours += (now.getTime() - createdAtDate.getTime()) / 3_600_000;
          openCount += 1;
        }
      }

      const recencyDate = updatedAtDate ?? createdAtDate ?? now;
      const requesterKey = ticket.usuario || "Não informado";
      const prev = requesterStats.get(requesterKey);
      if (prev) {
        prev.count += 1;
        if (recencyDate > prev.last) prev.last = recencyDate;
      } else {
        requesterStats.set(requesterKey, { count: 1, last: recencyDate });
      }
    });

    const avgOpenHours = openCount > 0 ? totalOpenHours / openCount : null;
    const avgResolutionHours = resolvedCount > 0 ? totalResolutionHours / resolvedCount : null;
    const slaCompliancePct = ticketsWithSla > 0 ? (ticketsWithinSla / ticketsWithSla) * 100 : null;

    const summaryRows: (string | number | null)[][] = [
      ["Relatório de Tickets ZenTicket", null],
      ["Gerado em", now.toLocaleString("pt-BR")],
      ["Período selecionado", periodLabels[selectedPeriod as ReportsPeriod] ?? selectedPeriod],
      ["Filtro de setor", selectedDepartmentLabel],
      [],
      ["Resumo Geral"],
      ["Métrica", "Valor"],
    ];

    if (summaryForExport) {
      summaryRows.push(
        ["Total de Tickets", summaryForExport.totalTickets],
        ["Resolvidos", summaryForExport.resolved],
        ["Pendentes", summaryForExport.pending],
        ["Tempo Médio (h)", summaryForExport.avgResolutionHours ?? "-"],
      );
    } else {
      summaryRows.push(["Total de Tickets", exportTickets.length]);
    }

    summaryRows.push(
      ["Tickets exportados", exportTickets.length],
      ["Tickets SLA vencido", slaBuckets.Vencido],
      ["Tickets em atenção ao SLA", slaBuckets.Atenção],
      ["Tickets em estado crítico", slaBuckets.Crítico],
      ["Tickets sem SLA", slaBuckets["Sem SLA"]],
      ["Tempo médio em aberto (h)", avgOpenHours ? formatNumber(avgOpenHours) : "-"],
      ["Tempo médio de resolução (h)", avgResolutionHours ? formatNumber(avgResolutionHours) : "-"],
      ["Clientes únicos atendidos", requesterStats.size],
      [
        "Conformidade com SLA",
        slaCompliancePct != null ? `${formatNumber(slaCompliancePct)}%` : "-",
      ],
    );

    const summarySheet = utils.aoa_to_sheet(summaryRows);
    summarySheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    summarySheet["!cols"] = [{ wch: 36 }, { wch: 28 }];
    Object.assign(summarySheet, { "!freeze": { ySplit: 5, xSplit: 0 } });
    utils.book_append_sheet(workbook, summarySheet, "Resumo");

    if (summaryForExport) {
      const deptRows: (string | number)[][] = [["Setor", "Quantidade"]];
      const departments = Object.entries(summaryForExport.departments ?? {});
      if (departments.length === 0) {
        deptRows.push(["Sem dados", ""]);
      } else {
        departments.forEach(([dept, count]) => {
          deptRows.push([dept, count]);
        });
      }
      const deptSheet = utils.aoa_to_sheet(deptRows);
      Object.assign(deptSheet, { "!freeze": { ySplit: 1, xSplit: 0 } });
      deptSheet["!cols"] = [{ wch: 28 }, { wch: 16 }];
      utils.book_append_sheet(workbook, deptSheet, "Setores");

      const priorityRows: (string | number)[][] = [["Prioridade", "Quantidade"]];
      const priorities = Object.entries(summaryForExport.priorities ?? {});
      if (priorities.length === 0) {
        priorityRows.push(["Sem dados", ""]);
      } else {
        priorities.forEach(([priority, count]) => {
          priorityRows.push([priority, count]);
        });
      }
      const prioritySheet = utils.aoa_to_sheet(priorityRows);
      Object.assign(prioritySheet, { "!freeze": { ySplit: 1, xSplit: 0 } });
      prioritySheet["!cols"] = [{ wch: 20 }, { wch: 16 }];
      utils.book_append_sheet(workbook, prioritySheet, "Prioridades");
    }

    const statusRows: (string | number)[][] = [["Status", "Quantidade", "Percentual"]];
    const totalStatus = Object.values(statusCounts).reduce((acc, value) => acc + value, 0);
    if (totalStatus === 0) {
      statusRows.push(["Sem dados", "", ""]);
    } else {
      Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => {
          const pct = totalStatus > 0 ? (count / totalStatus) * 100 : 0;
          statusRows.push([status, count, `${formatNumber(pct)}%`]);
        });
      statusRows.push(["Total", totalStatus, "100,0%"]);
    }
    const statusSheet = utils.aoa_to_sheet(statusRows);
    Object.assign(statusSheet, { "!freeze": { ySplit: 1, xSplit: 0 } });
    statusSheet["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }];
    statusSheet["!autofilter"] = { ref: statusSheet["!ref"] ?? `A1:C${statusRows.length}` };
    utils.book_append_sheet(workbook, statusSheet, "Status");

    const slaDisplayLabel: Record<keyof typeof slaBuckets, string> = {
      Vencido: "Vencido",
      Crítico: "Crítico (<2h)",
      Atenção: "Atenção (<8h)",
      Normal: "Normal (>8h)",
      "Sem SLA": "Sem SLA configurado",
    };
    const slaRows: (string | number)[][] = [["Categoria SLA", "Quantidade", "Percentual"]];
    const totalSla = Object.values(slaBuckets).reduce((acc, value) => acc + value, 0);
    Object.entries(slaBuckets).forEach(([bucket, count]) => {
      const pct = totalSla > 0 ? (count / totalSla) * 100 : 0;
      slaRows.push([slaDisplayLabel[bucket as keyof typeof slaBuckets], count, `${formatNumber(pct)}%`]);
    });
    if (totalSla > 0) {
      slaRows.push(["Total", totalSla, "100,0%"]);
    }
    const slaSheet = utils.aoa_to_sheet(slaRows);
    Object.assign(slaSheet, { "!freeze": { ySplit: 1, xSplit: 0 } });
    slaSheet["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }];
    slaSheet["!autofilter"] = { ref: slaSheet["!ref"] ?? `A1:C${slaRows.length}` };
    utils.book_append_sheet(workbook, slaSheet, "SLA");

    const clientRows: (string | number)[][] = [["Solicitante", "Tickets", "Percentual", "Última Atividade"]];
    const sortedClients = Array.from(requesterStats.entries()).sort((a, b) => b[1].count - a[1].count);
    if (sortedClients.length === 0) {
      clientRows.push(["Sem dados", "", "", ""]);
    } else {
      sortedClients.slice(0, 15).forEach(([name, data]) => {
        const pct = exportTickets.length > 0 ? (data.count / exportTickets.length) * 100 : 0;
        clientRows.push([name, data.count, `${formatNumber(pct)}%`, data.last.toLocaleString("pt-BR")]);
      });
    }
    const clientSheet = utils.aoa_to_sheet(clientRows);
    Object.assign(clientSheet, { "!freeze": { ySplit: 1, xSplit: 0 } });
    clientSheet["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 16 }, { wch: 24 }];
    clientSheet["!autofilter"] = { ref: clientSheet["!ref"] ?? `A1:D${clientRows.length}` };
    utils.book_append_sheet(workbook, clientSheet, "Solicitantes");

    if (exportTickets.length > 0) {
      const sanitize = (value: unknown) => `${value ?? ""}`.replace(/[\n\r]/g, " ").trim();
      const ticketsRows: (string | number)[][] = [[
        "ID",
        "Título",
        "Solicitante",
        "Setor",
        "Prioridade",
        "Status",
        "SLA",
        "SLA Status",
        "Criado em",
        "Atualizado em",
        "Tempo aberto (h)",
        "Horas p/ SLA",
      ]];

      exportTickets.forEach((ticket) => {
        const sla = getSlaStatus(ticket);
        const createdAt =
          (ticket as { dataCriacao?: string }).dataCriacao ??
          (ticket as { criadoEm?: string }).criadoEm ??
          (ticket as { createdAt?: string }).createdAt;
        const updatedAt =
          (ticket as { dataAtualizacao?: string }).dataAtualizacao ??
          (ticket as { atualizadoEm?: string }).atualizadoEm ??
          createdAt;
        const createdAtDate = parseDate(createdAt);
        const updatedAtDate = parseDate(updatedAt);
        const slaDate = parseDate(ticket.slaVencimento);
        const endReference =
          ticket.status === "Resolvido" || ticket.status === "Fechado" ? updatedAtDate : now;
        const tempoAbertoHoras =
          createdAtDate && endReference
            ? (endReference.getTime() - createdAtDate.getTime()) / 3_600_000
            : null;
        const horasParaSla = slaDate ? (slaDate.getTime() - now.getTime()) / 3_600_000 : null;

        ticketsRows.push([
          sanitize(ticket.id),
          sanitize(ticket.titulo),
          sanitize(ticket.usuario),
          sanitize(ticket.departamento),
          sanitize(ticket.prioridade),
          sanitize(ticket.status),
          sanitize(formatDateTime(ticket.slaVencimento)),
          sanitize(sla.status),
          sanitize(formatDateTime(createdAt)),
          sanitize(formatDateTime(updatedAt)),
          sanitize(formatNumber(tempoAbertoHoras ?? null)),
          sanitize(formatNumber(horasParaSla ?? null)),
        ]);
      });

      const ticketsSheet = utils.aoa_to_sheet(ticketsRows);
      ticketsSheet["!cols"] = [
        { wch: 16 },
        { wch: 36 },
        { wch: 26 },
        { wch: 18 },
        { wch: 12 },
        { wch: 16 },
        { wch: 22 },
        { wch: 16 },
        { wch: 22 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
      ];
      Object.assign(ticketsSheet, { "!freeze": { ySplit: 1, xSplit: 0 } });
      const lastCell = utils.encode_cell({ c: ticketsRows[0].length - 1, r: ticketsRows.length - 1 });
      ticketsSheet["!autofilter"] = { ref: `A1:${lastCell}` };
      utils.book_append_sheet(workbook, ticketsSheet, "Tickets");
    }

    const filename = `relatorio-${selectedPeriod}-${now.toISOString().slice(0, 10)}.xlsx`;
    writeFileXLSX(workbook, filename);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Relatórios e Chamados</h1>
          <p className="text-muted-foreground">
            Análise detalhada dos tickets e gestão de atendimentos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Setores</SelectItem>
              <SelectItem value="ti">T.I</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="rh">RH</SelectItem>
              <SelectItem value="producao">Produção</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExportToExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="todos-chamados">Todos Chamados</TabsTrigger>
        </TabsList>

        <TabsContent value="relatorios" className="space-y-6 mt-6">
          {/* Loading / Error states */}
          {error && (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-destructive">Erro</CardTitle>
                <CardDescription>
                  Não foi possível carregar métricas.
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2"
                    onClick={() => setSelectedPeriod(selectedPeriod)}
                  >
                    Tentar novamente
                  </Button>
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Total de Tickets</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? <Skeleton className="h-6 w-12 inline-block" /> : filteredSummary?.totalTickets ?? 0}
                </div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
                  +12% vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Resolvidos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {loading ? <Skeleton className="h-6 w-10 inline-block" /> : filteredSummary?.resolved ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    if (!filteredSummary || filteredSummary.totalTickets === 0) return "0% de resolução";
                    const pct = Math.round((filteredSummary.resolved / filteredSummary.totalTickets) * 100);
                    return `${pct}% de resolução`;
                  })()}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">
                  {loading ? <Skeleton className="h-6 w-10 inline-block" /> : filteredSummary?.pending ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Aguardando atendimento</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Tempo Médio</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? (
                    <Skeleton className="h-6 w-14 inline-block" />
                  ) : filteredSummary?.avgResolutionHours != null ? (
                    `${filteredSummary.avgResolutionHours} h`
                  ) : (
                    "-"
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Resolução por ticket</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground">Tickets por Setor</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Distribuição de tickets por departamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading && !filteredSummary && (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                )}
                {!loading &&
                  Object.entries(filteredSummary?.departments ?? {}).map(([dept, count], index) => (
                    <div key={dept} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-foreground/30" />
                        <span className="font-medium text-foreground">{dept}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={departmentColors[index % departmentColors.length]}>
                          {count} tickets
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {filteredSummary && filteredSummary.totalTickets > 0
                            ? `${Math.round((count / filteredSummary.totalTickets) * 100)}%`
                            : "0%"}
                        </span>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground">Tickets por Prioridade</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Distribuição por nível de criticidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading && !filteredSummary && (
                  <div className="space-y-2">
                    {["Crítica", "Alta", "Média", "Baixa"].map((p) => (
                      <Skeleton key={p} className="h-6 w-full" />
                    ))}
                  </div>
                )}
                {!loading &&
                  Object.entries(filteredSummary?.priorities ?? {}).map(([priority, count]) => (
                    <div key={priority} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{priority}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColorsSoft[priority as keyof typeof priorityColorsSoft]}>
                          {count} tickets
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {filteredSummary && filteredSummary.totalTickets > 0
                            ? `${Math.round((count / filteredSummary.totalTickets) * 100)}%`
                            : "0%"}
                        </span>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="todos-chamados" className="space-y-6 mt-6">
          {/* Next Tickets Priority */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Timer className="h-5 w-5" />
                Próximos Atendimentos (SLA)
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Chamados ordenados por prioridade de SLA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getNextTickets().map((ticket) => {
                  const sla = getSlaStatus(ticket);
                  return (
                    <div key={ticket.id} className={`p-3 rounded-lg border ${sla.bgColor} border-border`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {ticket.id}
                          </Badge>
                          <div>
                            <p className="font-medium text-foreground">{ticket.titulo}</p>
                            <p className="text-sm text-muted-foreground">
                              {ticket.usuario} • {ticket.departamento}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={priorityColorsSoft[ticket.prioridade as keyof typeof priorityColorsSoft]}>
                            {ticket.prioridade}
                          </Badge>
                          <span className={`text-sm font-medium ${sla.color}`}>{sla.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* All Tickets by Status */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {["Aberto", "Em Andamento", "Pendente", "Resolvido"].map((status) => {
              const statusTickets = getFilteredTickets().filter((ticket) => ticket.status === status);
              const statusColors = {
                Aberto: "border-border bg-card",
                "Em Andamento": "border-border bg-card",
                Pendente: "border-border bg-card",
                Resolvido: "border-border bg-card",
              } as const;

              return (
                <Card key={status} className={`${statusColors[status as keyof typeof statusColors]} shadow-sm`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      {status}
                    </CardTitle>
                    <CardDescription>{statusTickets.length} chamados</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {statusTickets.map((ticket) => (
                        <div key={ticket.id} className="p-2 bg-card rounded border border-border">
                          <div className="text-sm font-medium text-foreground">{ticket.titulo}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ticket.usuario}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <Badge className={priorityColorsSoft[ticket.prioridade as keyof typeof priorityColorsSoft]}>
                              {ticket.prioridade}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{ticket.id}</span>
                          </div>
                        </div>
                      ))}
                      {statusTickets.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          Nenhum chamado {status.toLowerCase()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* All Tickets Table */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Todos os Chamados</CardTitle>
              <CardDescription className="text-muted-foreground">
                Lista completa com informações de SLA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>SLA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredTickets().map((ticket) => {
                      const sla = getSlaStatus(ticket);
                      return (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">{ticket.id}</TableCell>
                          <TableCell>{ticket.titulo}</TableCell>
                          <TableCell>{ticket.usuario}</TableCell>
                          <TableCell>{ticket.departamento}</TableCell>
                          <TableCell>
                            <Badge className={priorityColorsSoft[ticket.prioridade as keyof typeof priorityColorsSoft]}>
                              {ticket.prioridade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{ticket.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium ${sla.color}`}>{sla.status}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
