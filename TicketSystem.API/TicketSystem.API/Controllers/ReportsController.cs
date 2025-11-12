using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketSystem.API.Data;
using TicketSystem.API.Models.Entities;
using TicketSystem.API.Models.Enums;

namespace TicketSystem.API.Controllers
{
    /// <summary>
    /// Controller de métricas agregadas (relatórios operacionais).
    /// Endpoint principal: GET /api/reports/summary?period=semanal|mensal|trimestral
    /// Retorna um snapshot com contagens e distribuições usadas pelo frontend.
    /// Somente usuários com permissão (CanViewReports) ou perfis Admin/Agent podem acessar.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class ReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public ReportsController(ApplicationDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// Retorna métricas consolidadas de tickets para o período solicitado.
        /// Períodos suportados:
        ///  - semanal: últimos 7 dias
        ///  - mensal: mês corrente
        ///  - trimestral: últimos 90 dias
        /// </summary>
        /// <param name="period">semanal|mensal|trimestral (default: mensal)</param>
        [HttpGet("summary")]
        [Authorize]
        public async Task<IActionResult> GetSummary([FromQuery] string? period = null)
        {
            period = (period ?? "mensal").Trim().ToLowerInvariant();
            // Ajuste: usar janela deslizante (últimos X dias) para evitar 0 quando mês corrente iniciou agora.
            // semanal -> últimos 7 dias; mensal -> últimos 30 dias; trimestral -> últimos 90 dias.
            var now = DateTime.UtcNow;
            DateTime fromUtc = period switch
            {
                "semanal" => now.AddDays(-7),
                "trimestral" => now.AddDays(-90),
                _ => now.AddDays(-30) // mensal (janela deslizante)
            };

            // Controle de acesso: somente perfis Admin ou Agent podem acessar.
            // (Regra ajustada: propriedade específica CanViewReports existia apenas em Admin, causando erro de compilação ao acessar via Users.)
            var isAdmin = User.IsInRole("Admin");
            var isAgent = User.IsInRole("Agent");
            if (!isAdmin && !isAgent)
            {
                return Forbid();
            }

            var ticketsQuery = _db.Tickets
                .AsNoTracking()
                .Include(t => t.Department)
                .Where(t => t.CreatedAt >= fromUtc);

            var totalTickets = await ticketsQuery.CountAsync();
            var resolvedCount = await ticketsQuery.CountAsync(t => t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed);
            var pendingCount = await ticketsQuery.CountAsync(t => t.Status == TicketStatus.Open || t.Status == TicketStatus.InProgress || t.Status == TicketStatus.WaitingCustomer || t.Status == TicketStatus.WaitingAgent);

            // Tempo médio de resolução considerando apenas tickets resolvidos/fechados com ResolvedAt
            var resolvedWithTime = await ticketsQuery
                .Where(t => (t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed) && t.ResolvedAt.HasValue)
                .Select(t => EF.Functions.DateDiffMinute(t.CreatedAt, t.ResolvedAt!.Value))
                .ToListAsync();
            double? avgResolutionHours = null;
            if (resolvedWithTime.Count > 0)
            {
                avgResolutionHours = Math.Round(resolvedWithTime.Average() / 60.0, 1);
            }

            // Distribuição por departamento
            var deptDistribution = await ticketsQuery
                .GroupBy(t => t.Department.Name)
                .Select(g => new { Department = g.Key, Count = g.Count() })
                .ToListAsync();

            // Distribuição detalhada por departamento (totais por status)
            var deptDetailed = await ticketsQuery
                .GroupBy(t => t.Department.Name)
                .Select(g => new
                {
                    Department = g.Key,
                    Total = g.Count(),
                    Resolved = g.Count(t => t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed),
                    Pending = g.Count(t => t.Status == TicketStatus.Open || t.Status == TicketStatus.InProgress || t.Status == TicketStatus.WaitingCustomer || t.Status == TicketStatus.WaitingAgent)
                })
                .ToListAsync();

            // Distribuição por prioridade
            var priorityDistribution = await ticketsQuery
                .GroupBy(t => t.Priority)
                .Select(g => new { Priority = g.Key, Count = g.Count() })
                .ToListAsync();

            // Map de prioridade para labels PT (já usado no frontend)
            Dictionary<TicketPriority, string> priorityPt = new()
            {
                { TicketPriority.Urgent, "Crítica" },
                { TicketPriority.High, "Alta" },
                { TicketPriority.Normal, "Média" },
                { TicketPriority.Low, "Baixa" }
            };

            var departmentsObj = deptDistribution
                .OrderByDescending(d => d.Count)
                .ToDictionary(d => d.Department, d => d.Count);
            var prioritiesObj = priorityDistribution
                .ToDictionary(p => priorityPt[p.Priority], p => p.Count);

            var result = new
            {
                Period = period,
                TotalTickets = totalTickets,
                Resolved = resolvedCount,
                Pending = pendingCount,
                AvgResolutionHours = avgResolutionHours,
                Departments = departmentsObj,
                Priorities = prioritiesObj,
                DepartmentsDetailed = deptDetailed
            };

            return Ok(new { Message = "Resumo de relatórios", Data = result });
        }
    }
}
