namespace SCHearing.API.Dtos
{
    public class QuestionImportDto
    {
        public string BusinessType { get; set; } = "";
        public string QuestionNo { get; set; } = "";
        public string Text { get; set; } = "";
        public string Type { get; set; } = "";

        public Dictionary<string, string>? ChoicePrograms { get; set; }
        public List<string>? YesPrograms { get; set; }
        public List<string>? NoPrograms { get; set; }

        public string Implementation { get; set; } = "";
        public string Settings { get; set; } = "";
        public string Priority { get; set; } = "中";
    }
}