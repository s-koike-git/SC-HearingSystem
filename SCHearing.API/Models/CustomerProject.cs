using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SCHearing.API.Models
{
    [Table("CustomerProjects")]
    public class CustomerProject
    {
        [Key] public int Id { get; set; }
        [Required] public int CustomerId { get; set; }
        [Required] public string ProjectName { get; set; } = string.Empty;
        // サーバーリプレイス / SCカスタマイズ / バージョンアップ / 商品購入 / 保守契約 / その他
        public string ProjectType { get; set; } = "その他";
        // 提案中 / 商談中 / 受注 / 対応中 / 完了 / 失注
        public string Status { get; set; } = "提案中";
        public string? Description { get; set; }
        public string? StartDate { get; set; }
        public string? ExpectedEndDate { get; set; }
        public int? Amount { get; set; }
        [Required] public DateTime CreatedAt { get; set; } = DateTime.Now;
        [Required] public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}
