// =====================================================
// FlowMasterModels.cs (F5: 4階層対応 完璧版)
// 変更点:
//   - BusinessFlowStep: 業務処理単位(第2階層)の役割に再定義、PositionX/Y追加
//   - 旧BusinessFlowStepの実体は FunctionalFlowStep へ移管 (別ファイル)
// =====================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SCHearing.API.Models
{
    /// <summary>
    /// 業務フロー (第2階層: 業務処理単位)
    /// 約80件の業務処理を表現
    /// コンサル・要件定義者向けの中粒度
    /// </summary>
    [Table("BusinessFlowSteps")]
    public class BusinessFlowStep
    {
        [Key]
        public int Id { get; set; }

        /// <summary>業務処理ID (例: 'estimate_create', 'order_receive')</summary>
        [Required]
        public string StepId { get; set; } = string.Empty;

        /// <summary>業務処理名 (例: '見積作成', '受注受付')</summary>
        [Required]
        public string StepName { get; set; } = string.Empty;

        /// <summary>ノードID (StepIdと同じ値、互換性のため保持)</summary>
        [Required]
        public string NodeId { get; set; } = string.Empty;

        /// <summary>ノードラベル (StepNameと同じ値)</summary>
        [Required]
        public string NodeLabel { get; set; } = string.Empty;

        [Required]
        public string NodeType { get; set; } = "process";

        [Required]
        public int DisplayOrder { get; set; }

        public string? ParentNodeId { get; set; }

        public string ConnectionType { get; set; } = "normal";

        public string? MermaidStyle { get; set; }

        /// <summary>業務プロセス(第1階層) StepIdへの参照</summary>
        [MaxLength(100)]
        public string? BusinessProcessStepId { get; set; }

        /// <summary>ReactFlow位置X (NEW: F5)</summary>
        public double? PositionX { get; set; }

        /// <summary>ReactFlow位置Y (NEW: F5)</summary>
        public double? PositionY { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// システムフロー工程マスタ (第4階層)
    /// </summary>
    [Table("SystemFlowSteps")]
    public class SystemFlowStep
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string StepId { get; set; } = string.Empty;

        [Required]
        public string StepName { get; set; } = string.Empty;

        [Required]
        public string BusinessType { get; set; } = string.Empty;

        public string? BusinessFlowStepId { get; set; }

        [Required]
        public int DisplayOrder { get; set; }

        [Required]
        public bool IsSubgraph { get; set; } = false;

        public string? SubgraphLabel { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// システムフローノードマスタ (第4階層)
    /// </summary>
    [Table("SystemFlowNodes")]
    public class SystemFlowNode
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string NodeId { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string FlowStepId { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string NodeLabel { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string NodeType { get; set; } = "process";

        [Required]
        [MaxLength(30)]
        public string SourceType { get; set; } = "program";

        [MaxLength(200)]
        public string? SourceRef { get; set; }

        public int DisplayOrder { get; set; } = 0;

        [MaxLength(50)]
        public string? MermaidStyle { get; set; }

        public double? PositionX { get; set; }
        public double? PositionY { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// 質問とフロー工程の紐づけマスタ
    /// FlowType: 'business' / 'functional' / 'system' のいずれか
    /// </summary>
    [Table("FlowQuestionMappings")]
    public class FlowQuestionMapping
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string BusinessType { get; set; } = string.Empty;

        [Required]
        public string QuestionNo { get; set; } = string.Empty;

        [Required]
        public string AnswerCondition { get; set; } = string.Empty;

        [Required]
        public string FlowStepId { get; set; } = string.Empty;

        [Required]
        public string FlowType { get; set; } = string.Empty;

        public int Priority { get; set; } = 0;

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// プログラムとフロー工程の紐づけマスタ (段階廃止予定)
    /// </summary>
    [Table("FlowProgramMappings")]
    public class FlowProgramMapping
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string FlowStepId { get; set; } = string.Empty;

        [Required]
        public string ProgramId { get; set; } = string.Empty;

        [Required]
        public int DisplayOrder { get; set; }

        [Required]
        public bool IsRequired { get; set; } = true;

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// フロー接続定義マスタ
    /// FlowType: 'business' / 'functional' / 'system' のいずれか
    /// </summary>
    [Table("FlowConnections")]
    public class FlowConnection
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string FromNodeId { get; set; } = string.Empty;

        [Required]
        public string ToNodeId { get; set; } = string.Empty;

        [Required]
        public string ConnectionType { get; set; } = "normal";

        public string? ConditionLabel { get; set; }

        [Required]
        public int DisplayOrder { get; set; }

        [Required]
        [MaxLength(20)]
        public string FlowType { get; set; } = "business";

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }
}
