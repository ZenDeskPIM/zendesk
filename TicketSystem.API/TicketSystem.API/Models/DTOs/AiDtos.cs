using System.ComponentModel.DataAnnotations;

namespace TicketSystem.API.Models.DTOs
{
    public class AiAnalyzeRequest
    {
        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        public List<string>? DoneActions { get; set; }
        public List<string>? RejectedActions { get; set; }
        public List<string>? PriorSuggestions { get; set; }
    }

    public class AiAnalyzeResponse
    {
        public List<string> Suggestions { get; set; } = new();
        public int? PredictedDepartmentId { get; set; }
        public string? PredictedDepartmentName { get; set; }
        public double? Confidence { get; set; }
        public string? PriorityHint { get; set; }
        public string? Rationale { get; set; }
        public string? Source { get; set; }
        public string? NextAction { get; set; }
        public List<string> FollowUpQuestions { get; set; } = new();
    }
}
