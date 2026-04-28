// =====================================================
// FunctionalFlowStep.cs
// F5: 機能フロー(第3階層)用モデル (NEW)
// 旧BusinessFlowStepの実体をこちらに移管
// =====================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SCHearing.API.Models
{
    /// <summary>
    /// 機能フロー (第3階層)
    /// 処理機能単位の詳細フロー (旧BusinessFlowStepsの内容を移管)
    /// 実装者・カスタマイズ検討者向け
    /// </summary>
    [Table("FunctionalFlowSteps")]
    public class FunctionalFlowStep
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string StepId { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string StepName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string NodeId { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string NodeLabel { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string NodeType { get; set; } = string.Empty;

        [Required]
        public int DisplayOrder { get; set; }

        [MaxLength(50)]
        public string? ParentNodeId { get; set; }

        [MaxLength(50)]
        public string ConnectionType { get; set; } = "normal";

        [MaxLength(50)]
        public string? MermaidStyle { get; set; }

        /// <summary>
        /// 業務フロー(第2階層) StepIdへの参照
        /// 例: 'estimate_create', 'order_receive'
        /// </summary>
        [MaxLength(100)]
        public string? BusinessFlowStepId { get; set; }

        /// <summary>
        /// 業務プロセス(第1階層) StepIdへの参照
        /// 例: '見積', '受注'
        /// </summary>
        [MaxLength(100)]
        public string? BusinessProcessStepId { get; set; }

        /// <summary>ReactFlow位置X</summary>
        public double? PositionX { get; set; }

        /// <summary>ReactFlow位置Y</summary>
        public double? PositionY { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }
}
