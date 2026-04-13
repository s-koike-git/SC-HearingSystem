namespace SCHearing.API.Models
{
    /// <summary>
    /// 条件（Excel条件シートに相当）
    /// 1つの質問に対して複数のプログラムを関連付け可能
    /// </summary>
    public class Condition
    {
        public int Id { get; set; }
        
        /// <summary>
        /// 業務種別（見積、受注など）
        /// </summary>
        public string BusinessType { get; set; } = string.Empty;
        
        /// <summary>
        /// 質問番号（Q1, Q2など）
        /// </summary>
        public string QuestionNo { get; set; } = string.Empty;
        
        /// <summary>
        /// 質問内容（参考用）
        /// </summary>
        public string QuestionText { get; set; } = string.Empty;
        
        /// <summary>
        /// 回答条件（○の場合、1の場合、全回答など）
        /// </summary>
        public string AnswerCondition { get; set; } = string.Empty;
        
        /// <summary>
        /// プログラムID
        /// </summary>
        public string ProgramId { get; set; } = string.Empty;
        
        /// <summary>
        /// プログラム名
        /// </summary>
        public string ProgramName { get; set; } = string.Empty;
        
        /// <summary>
        /// 標準機能かどうか
        /// </summary>
        public bool IsStandard { get; set; } = true;
        
        /// <summary>
        /// 備考
        /// </summary>
        public string Remarks { get; set; } = string.Empty;
        
        /// <summary>
        /// 表示順序（同じQ№内での順序）
        /// </summary>
        public int DisplayOrder { get; set; } = 0;
        
        /// <summary>
        /// 作成日時
        /// </summary>
        public DateTime CreatedAt { get; set; }
        
        /// <summary>
        /// 更新日時
        /// </summary>
        public DateTime UpdatedAt { get; set; }
    }
}
