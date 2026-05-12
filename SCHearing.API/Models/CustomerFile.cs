using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SCHearing.API.Models
{
    [Table("CustomerFiles")]
    public class CustomerFile
    {
        [Key] public int Id { get; set; }
        [Required] public int CustomerId { get; set; }
        public int? ProjectId { get; set; }
        [Required] public string FileName { get; set; } = string.Empty;   // 元のファイル名
        [Required] public string StoredName { get; set; } = string.Empty; // サーバー上のファイル名(UUID)
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string? Description { get; set; }
        public string UploadedBy { get; set; } = string.Empty;
        [Required] public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
