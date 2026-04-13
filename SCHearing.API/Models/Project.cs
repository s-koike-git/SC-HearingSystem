using System.Text.Json.Serialization;

namespace SCHearing.API.Models
{
    /// <summary>
    /// 案件（プロジェクト）
    /// </summary>
    public class Project
    {
        public int Id { get; set; }
        
        /// <summary>
        /// 会社名
        /// </summary>
        public string CompanyName { get; set; } = string.Empty;
        
        /// <summary>
        /// 業種
        /// </summary>
        public string Industry { get; set; } = string.Empty;
        
        /// <summary>
        /// 担当者名
        /// </summary>
        public string ContactPerson { get; set; } = string.Empty;
        
        /// <summary>
        /// 電話番号
        /// </summary>
        public string PhoneNumber { get; set; } = string.Empty;
        
        /// <summary>
        /// メールアドレス
        /// </summary>
        public string Email { get; set; } = string.Empty;
        
        /// <summary>
        /// 備考
        /// </summary>
        public string Remarks { get; set; } = string.Empty;
        
        /// <summary>
        /// 作成日時
        /// </summary>
        public DateTime CreatedAt { get; set; }
        
        /// <summary>
        /// 更新日時
        /// </summary>
        public DateTime UpdatedAt { get; set; }
        
        /// <summary>
        /// ステータス
        /// 未着手 / 進行中 / 完了 / 保留
        /// </summary>
        public string Status { get; set; } = "未着手";
        
        // ナビゲーションプロパティ（JSON送受信時は無視）
        [JsonIgnore]
        public List<Answer>? Answers { get; set; }
        
        [JsonIgnore]
        public List<Judgment>? Judgments { get; set; }
    }
}