using Microsoft.Extensions.Logging;
using TicketSystem.API.Data;
using TicketSystem.API.Models.Entities;

namespace TicketSystem.API.Services
{
    /// <summary>
    /// Encapsula a lógica de criação e seed do banco de dados.
    /// Separa responsabilidade do Program.cs para facilitar testes e manutenção.
    /// </summary>
    public static class DatabaseSeeder
    {
        public static void Seed(ApplicationDbContext context, ILogger logger)
        {
            // Garantir que o contexto esteja disponível
            if (context == null) return;

            // Departamentos
            if (!context.Departments.Any())
            {
                context.Departments.AddRange(
                    new Department { Name = "Financeiro", Description = "Pagamentos, faturamento e orçamento", Color = "#4ECDC4", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Department { Name = "RH", Description = "Admissão, folha e benefícios", Color = "#55EFC4", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Department { Name = "Produção", Description = "PCP, logística interna e chão de fábrica", Color = "#00CEC9", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Department { Name = "T.I", Description = "Suporte técnico, sistemas e infraestrutura", Color = "#6C5CE7", IsActive = true, CreatedAt = DateTime.UtcNow }
                );
                context.SaveChanges();
                logger.LogInformation("Departamentos inseridos pelo DatabaseSeeder.");
            }

            // Admin default
            if (!context.Admins.Any())
            {
                context.Admins.Add(new Admin
                {
                    FirstName = "Administrador",
                    LastName = "Sistema",
                    Email = "admin@ticketsystem.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
                context.SaveChanges();
                logger.LogInformation("Admin criado pelo DatabaseSeeder (admin@ticketsystem.com / admin123).");
            }
        }
    }
}
