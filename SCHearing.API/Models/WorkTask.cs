using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SCHearing.API.Models
{
    [Table("WorkTasks")]
    public class WorkTask
    {
        [Key] public int Id { get; set; }
        public int No { get; set; }
        public string Category { get; set; } = "自社";
        public string Assignees { get; set; } = "";        // カンマ区切り複数担当者
        public string CustomerName { get; set; } = "";
        public string TaskName { get; set; } = "";
        public string Status { get; set; } = "未着手";
        public string? StartDate { get; set; }
        public string? PlannedEndDate { get; set; }
        public string? ActualEndDate { get; set; }
        public double Progress { get; set; } = 0;
        public string Priority { get; set; } = "中";
        public string Notes { get; set; } = "";
        public string Deliverable { get; set; } = "";
        public int? ProjectId { get; set; }                // CustomerProjects FK（任意）
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}
