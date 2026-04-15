// =====================================================
// FlowMasterModels.cs
// 5つのフローマスタモデルクラス定義
// =====================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SCHearing.API.Models
{
    /// <summary>
    /// 業務フロー工程マスタ
    /// </summary>
    [Table("BusinessFlowSteps")]
    public class BusinessFlowStep
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string StepId { get; set; } = string.Empty;

        [Required]
        public string StepName { get; set; } = string.Empty;

        [Required]
        public string NodeId { get; set; } = string.Empty;

        [Required]
        public string NodeLabel { get; set; } = string.Empty;

        [Required]
        public string NodeType { get; set; } = string.Empty;

        [Required]
        public int DisplayOrder { get; set; }

        public string? ParentNodeId { get; set; }

        public string ConnectionType { get; set; } = "normal";

        public string? MermaidStyle { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// システムフロー工程マスタ
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
    /// 質問とフロー工程の紐づけマスタ
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
        public string FlowType { get; set; } = string.Empty; // "business" or "system"

        public int Priority { get; set; } = 0;

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// プログラムとフロー工程の紐づけマスタ
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
        public string ConnectionType { get; set; } = "normal"; // "normal", "conditional", "dotted"

        public string? ConditionLabel { get; set; }

        [Required]
        public int DisplayOrder { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }
    }
}
