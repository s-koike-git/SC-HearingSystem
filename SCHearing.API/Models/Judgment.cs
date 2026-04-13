using System.Text.Json.Serialization;

namespace SCHearing.API.Models
{
    /// <summary>
    /// 判定結果（自動判定されたプログラム）
    /// </summary>
    public class Judgment
    {
        public int Id { get; set; }
        
        /// <summary>
        /// 案件ID
        /// </summary>
        public int ProjectId { get; set; }
        
        /// <summary>
        /// プログラムID（例：ESTMR01）
        /// </summary>
        public string ProgramId { get; set; } = string.Empty;
        
        /// <summary>
        /// プログラム名（例：見積パターン登録）
        /// </summary>
        public string ProgramName { get; set; } = string.Empty;
        
        /// <summary>
        /// 業務種別（見積、受注など）
        /// </summary>
        public string BusinessType { get; set; } = string.Empty;
        
        /// <summary>
        /// 使用フラグ
        /// </summary>
        public bool IsUsed { get; set; }
        
        /// <summary>
        /// 標準機能フラグ
        /// </summary>
        public bool IsStandard { get; set; }
        
        /// <summary>
        /// カスタム要否フラグ（関連する回答でカスタムが必要か）
        /// </summary>
        public bool IsCustom { get; set; } = false;
        
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