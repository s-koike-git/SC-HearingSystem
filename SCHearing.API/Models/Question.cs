namespace SCHearing.API.Models
{
    public class Question
    {
        public int Id { get; set; }

        public string BusinessType { get; set; } = "";
        public string QuestionNo { get; set; } = "";

        // 既存
        public string QuestionText { get; set; } = "";
        public string AnswerType { get; set; } = "";
        public string? OptionsJson { get; set; }
        public int DisplayOrder { get; set; }

        // ✅ ここから追加
        public string Implementation { get; set; } = "";
        public string Settings { get; set; } = "";
        public string Priority { get; set; } = "中";
    }
}