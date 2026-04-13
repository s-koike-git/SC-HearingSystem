using System.Text.Json.Serialization;

namespace SCHearing.API.Models
{
    /// <summary>
    /// 回答（ヒアリング結果）
    /// </summary>
    public class Answer
    {
        public int Id { get; set; }
        
        /// <summary>
        /// 案件ID
        /// </summary>
        public int ProjectId { get; set; }
        
        /// <summary>
        /// 業務種別（見積、受注、引当など）
        /// </summary>
        public string BusinessType { get; set; } = string.Empty;
        
        /// <summary>
        /// 質問番号（Q1, Q2など）
        /// </summary>
        public string QuestionNo { get; set; } = string.Empty;
        
        /// <summary>
        /// 回答値（○、×、1、2、3、4など）
        /// </summary>
        public string AnswerValue { get; set; } = string.Empty;
        
        /// <summary>
        /// カスタム要否フラグ
        /// </summary>
        public bool IsCustom { get; set; } = false;
        
        /// <summary>
        /// メモ・備考
        /// </summary>
        public string Memo { get; set; } = string.Empty;
        
        /// <summary>
        /// 作成日時
        /// </summary>
        public DateTime CreatedAt { get; set; }
        
        /// <summary>
        /// 更新日時
        /// </summary>
        public DateTime UpdatedAt { get; set; }
        
        // ナビゲーションプロパティ（JSON送受信時は無視）
        [JsonIgnore]
        public Project? Project { get; set; }
    }
}