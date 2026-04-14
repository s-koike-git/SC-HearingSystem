using System;
using System.ComponentModel.DataAnnotations;

namespace SCHearing.API.Models
{
    /// <summary>
    /// プログラム工数見積もり明細
    /// </summary>
    public class ProgramEstimateItem
    {
        /// <summary>
        /// 明細ID
        /// </summary>
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// 見積もりID
        /// </summary>
        [Required]
        public int EstimateId { get; set; }

        /// <summary>
        /// プログラムID（既存プログラムの場合）
        /// </summary>
        [MaxLength(50)]
        public string? ProgramId { get; set; }

        /// <summary>
        /// プログラム名
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string ProgramName { get; set; } = string.Empty;

        /// <summary>
        /// 基本工数
        /// </summary>
        public decimal BaseWorkHours { get; set; }

        /// <summary>
        /// 難易度係数
        /// </summary>
        public decimal Factor { get; set; } = 1.0m;

        /// <summary>
        /// 新規プログラムフラグ
        /// </summary>
        public bool IsCustomProgram { get; set; } = false;

        /// <summary>
        /// 表示順序
        /// </summary>
        public int DisplayOrder { get; set; }

        /// <summary>
        /// 見積もりヘッダー
        /// </summary>
        public virtual ProgramEstimate? Estimate { get; set; }
    }
}
