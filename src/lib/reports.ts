/**
 * API de Relatórios / Métricas agregadas.
 * Endpoint: GET /reports/summary?period=semanal|mensal|trimestral
 */
import { api } from './api'

export type ReportsPeriod = 'semanal' | 'mensal' | 'trimestral'

export type ReportsSummary = {
  period: ReportsPeriod
  totalTickets: number
  resolved: number
  pending: number
  avgResolutionHours: number | null
  departments: Record<string, number>
  priorities: Record<'Crítica' | 'Alta' | 'Média' | 'Baixa', number>
  departmentsDetailed?: Array<{ department: string; total: number; resolved: number; pending: number }>
}

type RawDepartmentsDetailedItem = {
  Department?: string
  department?: string
  Total?: number
  total?: number
  Resolved?: number
  resolved?: number
  Pending?: number
  pending?: number
}

interface RawSummaryShape {
  Period?: ReportsPeriod
  TotalTickets?: number
  Resolved?: number
  Pending?: number
  AvgResolutionHours?: number | null
  Departments?: Record<string, number>
  Priorities?: Record<string, number>
  DepartmentsDetailed?: RawDepartmentsDetailedItem[]
}

interface RawEnvelopeShape {
  data?: RawSummaryShape
  Data?: RawSummaryShape
  message?: string
  Message?: string
}

export async function getReportsSummary(period: ReportsPeriod = 'mensal'): Promise<ReportsSummary> {
  const res = await api.get<RawEnvelopeShape>(`/reports/summary`, { params: { period } })
  const root = res.data || {}
  const d: RawSummaryShape = root.data || root.Data || {}
  const detailedRaw = d.DepartmentsDetailed || []
  const departmentsDetailed = Array.isArray(detailedRaw)
    ? detailedRaw.map((x): { department: string; total: number; resolved: number; pending: number } => ({
      department: x.Department ?? x.department ?? '',
      total: x.Total ?? x.total ?? 0,
      resolved: x.Resolved ?? x.resolved ?? 0,
      pending: x.Pending ?? x.pending ?? 0,
    }))
    : []
  return {
    period: (d.Period ?? period) as ReportsPeriod,
    totalTickets: d.TotalTickets ?? 0,
    resolved: d.Resolved ?? 0,
    pending: d.Pending ?? 0,
    avgResolutionHours: d.AvgResolutionHours ?? null,
    departments: d.Departments ?? {},
    priorities: (d.Priorities as ReportsSummary['priorities']) ?? { 'Crítica': 0, 'Alta': 0, 'Média': 0, 'Baixa': 0 },
    departmentsDetailed,
  }
}
