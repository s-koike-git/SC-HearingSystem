using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SCHearing.API.Models
{
    [Table("MasterItems")]
    public class MasterItem
    {
        [Key] public int Id { get; set; }
        [Required] public string Category { get; set; } = "";
        [Required] public string Value { get; set; } = "";
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
