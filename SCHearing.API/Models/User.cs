// =====================================================
// Models/User.cs（FullName・複数ロール対応版）
// =====================================================
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SCHearing.API.Models
{
    [Table("Users")]
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        // 氏名（表示名）
        public string FullName { get; set; } = string.Empty;

        // カンマ区切り複数ロール例: "admin,customer_manager"
        // 定義: admin / user / customer_manager
        [Required]
        public string Role { get; set; } = "user";

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}
