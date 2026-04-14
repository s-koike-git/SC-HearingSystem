using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SCHearing.API.Models
{
    /// <summary>
    /// プログラム工数見積もりヘッダー
    /// </summary>
    public class ProgramEstimate
    {
        /// <summary>
        /// 見積もりID
        /// </summary>
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// ユーザーID（作成者）
        /// </summary>
        [Required]
        public int UserId { get; set; }

        /// <summary>
        /// 見積もりタイトル
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// 説明
        /// </summary>
        [MaxLength(1000)]
        public string? Description { get; set; }

        /// <summary>
        /// 合計工数
        /// </summary>
        public decimal TotalHours { get; set; }

        /// <summary>
        /// 作成日時
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        /// <summary>
        /// 更新日時
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        /// <summary>
        /// 見積もり明細
        /// </summary>
        public virtual ICollection<ProgramEstimateItem> Items { get; set; } = new List<ProgramEstimateItem>();

        /// <summary>
        /// ユーザー
        /// </summary>
        public virtual User? User { get; set; }
    }
}
