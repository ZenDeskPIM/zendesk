using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketSystem.API.Models.DTOs;
using TicketSystem.API.Services.Interfaces;

namespace TicketSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class AiController : ControllerBase
    {
        private readonly IAiService _ai;

        public AiController(IAiService ai)
        {
            _ai = ai;
        }

        /// <summary>
        /// Analisa título e descrição do ticket via serviço de IA (Gemini se configurado; fallback heurístico).
        /// </summary>
        [HttpPost("analyze")]
        [Authorize]
        public async Task<IActionResult> Analyze([FromBody] AiAnalyzeRequest req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { Message = "Dados inválidos" });

            var result = await _ai.AnalyzeAsync(req, ct);
            return Ok(new { Message = "Análise concluída", Data = result });
        }
    }
}
