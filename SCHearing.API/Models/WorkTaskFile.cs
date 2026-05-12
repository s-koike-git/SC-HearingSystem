using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SCHearing.API.Models
{
    [Table("WorkTaskFiles")]
    public class WorkTaskFile
    {
        [Key] public int Id { get; set; }
        public int WorkTaskId { get; set; }
        [Required] public string FileName { get; set; } = "";
        public string FileType { get; set; } = "";
        public long FileSize { get; set; }
        public string UploadedBy { get; set; } = "";
        [Required] public string FilePath { get; set; } = "";
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
