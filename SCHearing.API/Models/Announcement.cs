using System;
using System.ComponentModel.DataAnnotations;

namespace SCHearing.API.Models
{
    /// <summary>
    /// お知らせモデル
    /// </summary>
    public class Announcement
    {
        /// <summary>
        /// お知らせID
        /// </summary>
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// タイトル
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// 内容
        /// </summary>
        [Required]
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// 優先度（重要、通常）
        /// </summary>
        [Required]
        [MaxLength(10)]
        public string Priority { get; set; } = "通常";

        /// <summary>
        /// 有効フラグ
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// 公開日時
        /// </summary>
        public DateTime PublishedAt { get; set; } = DateTime.Now;

        /// <summary>
        /// 作成日時
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        /// <summary>
        /// 更新日時
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}
