using System;
using System.ComponentModel.DataAnnotations;

namespace SCHearing.API.Models
{
    public class ProgramMaster
    {
        public int Id { get; set; }

        [Required]
        public string ProgramId { get; set; } = string.Empty;

        [Required]
        public string ProgramName { get; set; } = string.Empty;

        public double WorkHours { get; set; }

        // ✅ 追加：画面ID（ProgramIdと同一でOK）
        public string? ScreenId { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}