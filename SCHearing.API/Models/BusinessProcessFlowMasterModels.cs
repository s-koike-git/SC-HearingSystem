// =====================================================
// BusinessProcessFlowMasterModels.cs
// Phase C: 業務プロセスフロー用モデル (NEW)
// =====================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SCHearing.API.Models
{
    /// <summary>
    /// 業務プロセスフロー工程マスタ (第1階層)
    /// 業務プロセスの大区分の流れを表現する
    /// </summary>
    [Table("BusinessProcessFlowSteps")]
    public class BusinessProcessFlowStep
    {
        [Key]
        public int Id { get; set; }

        /// <summary>業務プロセスID (例: 見積, 受注, 出荷)</summary>
        [Required]
        [MaxLength(100)]
        public string StepId { get; set; } = string.Empty;

        /// <summary>業務プロセス名 (例: 見積プロセス)</summary>
        [Required]
        [MaxLength(200)]
        public string StepName { get; set; } = string.Empty;

        /// <summary>カテゴリ: 販売/請求売掛/購買/支払買掛/在庫/製造/原価/管理/物流OP</summary>
        [Required]
        [MaxLength(50)]
        public string Category { get; set; } = string.Empty;

        public int DisplayOrder { get; set; } = 0;

        /// <summary>業務プロセスの説明</summary>
        [MaxLength(1000)]
        public string? Description { get; set; }

        /// <summary>ReactFlow位置X（任意、未設定時は自動配置）</summary>
        public double? PositionX { get; set; }

        /// <summary>ReactFlow位置Y</summary>
        public double? PositionY { get; set; }

        /// <summary>Mermaidスタイル</summary>
        [MaxLength(50)]
        public string? MermaidStyle { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// 業務プロセスフロー接続マスタ
    /// 業務プロセス間の論理的な接続関係
    /// </summary>
    [Table("BusinessProcessFlowConnections")]
    public class BusinessProcessFlowConnection
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string FromStepId { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string ToStepId { get; set; } = string.Empty;

        /// <summary>接続タイプ: normal/conditional/dotted</summary>
        [Required]
        [MaxLength(50)]
        public string ConnectionType { get; set; } = "normal";

        [MaxLength(200)]
        public string? ConditionLabel { get; set; }

        public int DisplayOrder { get; set; } = 0;

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }
}
