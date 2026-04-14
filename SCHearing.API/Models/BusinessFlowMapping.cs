using System;

namespace SCHearing.API.Models
{
    /// <summary>
    /// 業務フローマッピング
    /// 業務タイプとMermaidフローノードの紐付けを管理
    /// </summary>
    public class BusinessFlowMapping
    {
        public int Id { get; set; }
        
        /// <summary>
        /// 業務タイプ（見積、受注、生産計画、製造...）
        /// </summary>
        public string BusinessType { get; set; } = string.Empty;
        
        /// <summary>
        /// ステップID（estimate, order, manufacturing...）
        /// </summary>
        public string StepId { get; set; } = string.Empty;
        
        /// <summary>
        /// MermaidノードID（A01, A02, F01...）
        /// </summary>
        public string NodeId { get; set; } = string.Empty;
        
        /// <summary>
        /// 表示順序
        /// </summary>
        public int DisplayOrder { get; set; }
        
        /// <summary>
        /// 有効/無効フラグ（1=有効, 0=無効）
        /// </summary>
        public int IsActive { get; set; } = 1;
        
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
