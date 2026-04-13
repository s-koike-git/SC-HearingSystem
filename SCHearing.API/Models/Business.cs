using System.ComponentModel.DataAnnotations;

namespace SCHearing.API.Models
{
    public class Business
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = "";

        public int DisplayOrder { get; set; }

        [Required]
        public string Status { get; set; } = "有効";

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}