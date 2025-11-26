using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketSystem.API.Data;
using TicketSystem.API.Models.DTOs;
using TicketSystem.API.Models.Entities;
using TicketSystem.API.Models.Enums;

namespace TicketSystem.API.Controllers
{
    /// <summary>
    /// Controller para gerenciamento de usuários do sistema.
    /// Fornece endpoints para listar, criar usuários e listar clientes (customers).
    /// A maioria dos endpoints é restrita a usuários com papel de Admin.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IMapper _mapper;

        public UsersController(ApplicationDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        /// <summary>
        /// Retorna uma lista paginada de usuários.
        /// </summary>
        /// <param name="page">Número da página (padrão: 1).</param>
        /// <param name="pageSize">Tamanho da página (padrão: 50).</param>
        /// <param name="q">Termo de busca para email ou nome.</param>
        /// <returns>Objeto com total, página, pageSize e lista de usuários (UserDto).</returns>
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] string? q = null)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);
            var query = _db.Users.AsNoTracking().Where(u => !u.IsDeleted).OrderBy(u => u.Id).AsQueryable();
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(u => u.Email.Contains(term) || (u.FirstName + " " + u.LastName).Contains(term));
            }

            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            var dtos = items.Select(u => _mapper.Map<UserDto>(u)).ToList();
            return Ok(new { Message = "Usuários obtidos", Data = new { Total = total, Page = page, PageSize = pageSize, Items = dtos } });
        }

        /// <summary>
        /// Cria um novo usuário (Customer, Agent ou Admin) baseado no DTO informado.
        /// </summary>
        /// <param name="dto">Dados do usuário a ser criado.</param>
        /// <returns>Created com dados do usuário criado ou Conflict caso o email já exista.</returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
            {
                return Conflict(new { Message = "Email já cadastrado" });
            }

            User entity;
            switch (dto.UserType)
            {
                case UserType.Agent:
                    entity = new Agent
                    {
                        FirstName = dto.FirstName,
                        LastName = dto.LastName,
                        Email = dto.Email,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                        UserType = UserType.Agent,
                        IsActive = dto.IsActive,
                        Specialization = dto.Specialization ?? string.Empty,
                        Level = dto.Level ?? 1,
                        IsAvailable = dto.IsAvailable ?? true
                    };
                    break;
                case UserType.Admin:
                    entity = new Admin
                    {
                        FirstName = dto.FirstName,
                        LastName = dto.LastName,
                        Email = dto.Email,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                        UserType = UserType.Admin,
                        IsActive = dto.IsActive
                    };
                    break;
                default:
                    entity = new Customer
                    {
                        FirstName = dto.FirstName,
                        LastName = dto.LastName,
                        Email = dto.Email,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                        UserType = UserType.Customer,
                        IsActive = dto.IsActive,
                        Department = dto.Department
                    };
                    break;
            }

            _db.Users.Add(entity);
            await _db.SaveChangesAsync();

            var result = _mapper.Map<UserDto>(entity);
            return CreatedAtAction(nameof(GetAll), new { id = entity.Id }, new { Message = "Usuário criado", Data = result });
        }

        /// <summary>
        /// Retorna somente os usuários do tipo Customer (clientes).
        /// Endpoint acessível por Admins e Agents para consulta de clientes.
        /// </summary>
        /// <param name="page">Página desejada (padrão:1).</param>
        /// <param name="pageSize">Tamanho da página (padrão:50).</param>
        /// <param name="q">Termo de busca para email ou nome.</param>
        /// <returns>Lista paginada de clientes (UserDto).</returns>
        [HttpGet("customers")]
        [Authorize(Roles = "Admin,Agent")]
        public async Task<IActionResult> GetCustomers([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] string? q = null)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 500);
            var query = _db.Users.OfType<Customer>().AsNoTracking().Where(u => !u.IsDeleted).OrderBy(u => u.Id).AsQueryable();
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(u => u.Email.Contains(term) || (u.FirstName + " " + u.LastName).Contains(term));
            }

            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            var dtos = items.Select(u => _mapper.Map<UserDto>(u)).ToList();
            return Ok(new { Message = "Clientes obtidos", Data = new { Total = total, Page = page, PageSize = pageSize, Items = dtos } });
        }

        /// <summary>
        /// Obtém um usuário específico pelo ID.
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
            if (user == null) return NotFound(new { Message = "Usuário não encontrado" });
            var dto = _mapper.Map<UserDto>(user);
            return Ok(new { Message = "Usuário obtido", Data = dto });
        }

        /// <summary>
        /// Atualiza os dados básicos de um usuário existente.
        /// </summary>
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
            if (user == null) return NotFound(new { Message = "Usuário não encontrado" });

            if (!string.Equals(user.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            {
                var emailExists = await _db.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id && !u.IsDeleted);
                if (emailExists)
                {
                    return Conflict(new { Message = "Email já cadastrado" });
                }
            }

            user.FirstName = dto.FirstName;
            user.LastName = dto.LastName;
            user.Email = dto.Email;
            user.IsActive = dto.IsActive;

            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            }

            switch (user)
            {
                case Customer customer:
                    customer.Department = dto.Department;
                    break;
                case Agent agent:
                    agent.Specialization = dto.Specialization ?? agent.Specialization;
                    if (dto.Level.HasValue)
                    {
                        agent.Level = dto.Level.Value;
                    }
                    if (dto.IsAvailable.HasValue)
                    {
                        agent.IsAvailable = dto.IsAvailable.Value;
                    }
                    break;
            }

            user.SetUpdatedAt();
            await _db.SaveChangesAsync();

            var result = _mapper.Map<UserDto>(user);
            return Ok(new { Message = "Usuário atualizado", Data = result });
        }

        /// <summary>
        /// Atualiza somente o status (ativo/inativo) do usuário.
        /// </summary>
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateUserStatusDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
            if (user == null) return NotFound(new { Message = "Usuário não encontrado" });

            user.IsActive = dto.IsActive;
            user.SetUpdatedAt();
            await _db.SaveChangesAsync();

            var result = _mapper.Map<UserDto>(user);
            return Ok(new { Message = "Status atualizado", Data = result });
        }

        /// <summary>
        /// Remove (soft delete) um usuário.
        /// </summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
            if (user == null) return NotFound(new { Message = "Usuário não encontrado" });

            // Impede remoção do último administrador ativo
            if (user.UserType == UserType.Admin)
            {
                var otherAdmins = await _db.Users.CountAsync(u => u.UserType == UserType.Admin && !u.IsDeleted && u.IsActive && u.Id != id);
                if (otherAdmins == 0)
                {
                    return BadRequest(new { Message = "Não é possível remover o último administrador ativo" });
                }
            }

            user.SoftDelete();
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}

