// =====================================================
// Models/Customer.cs
// =====================================================
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SCHearing.API.Models
{
    [Table("Customers")]
    public class Customer
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public string Industry { get; set; } = string.Empty;

        public string PrimeType { get; set; } = "プライム";

        public string? Partner { get; set; }

        public string Modules { get; set; } = "SC販売";

        public double? Version { get; set; }

        public string ProposalStatus { get; set; } = "未提案";

        public string? ScMaintDate { get; set; }

        public string? ServerEnv { get; set; }

        public string? ServerMaintDate { get; set; }

        public string Contact { get; set; } = string.Empty;

        public string? CustomerContact { get; set; }

        public string? Notes { get; set; }

        public int? MonthlyFee { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}
