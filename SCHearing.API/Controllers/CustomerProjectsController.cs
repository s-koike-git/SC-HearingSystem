using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomerProjectsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public CustomerProjectsController(AppDbContext context) { _context = context; }

        [HttpGet("customer/{customerId}")]
        public async Task<ActionResult<IEnumerable<CustomerProject>>> GetByCustomer(int customerId) =>
            await _context.CustomerProjects
                .Where(p => p.CustomerId == customerId)
                .OrderByDescending(p => p.CreatedAt).ToListAsync();

        [HttpPost]
        public async Task<ActionResult<CustomerProject>> Create([FromBody] CustomerProjectDto dto)
        {
            var proj = new CustomerProject {
                CustomerId = dto.CustomerId, ProjectName = dto.ProjectName,
                ProjectType = dto.ProjectType, Status = dto.Status,
                Description = dto.Description, StartDate = dto.StartDate,
                ExpectedEndDate = dto.ExpectedEndDate, Amount = dto.Amount,
                CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now,
            };
            _context.CustomerProjects.Add(proj);
            await _context.SaveChangesAsync();
            return Ok(proj);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CustomerProjectDto dto)
        {
            var proj = await _context.CustomerProjects.FindAsync(id);
            if (proj == null) return NotFound();
            proj.ProjectName = dto.ProjectName; proj.ProjectType = dto.ProjectType;
            proj.Status = dto.Status; proj.Description = dto.Description;
            proj.StartDate = dto.StartDate; proj.ExpectedEndDate = dto.ExpectedEndDate;
            proj.Amount = dto.Amount; proj.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(proj);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var proj = await _context.CustomerProjects.FindAsync(id);
            if (proj == null) return NotFound();
            _context.CustomerProjects.Remove(proj);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class CustomerProjectDto
    {
        public int CustomerId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string ProjectType { get; set; } = "その他";
        public string Status { get; set; } = "提案中";
        public string? Description { get; set; }
        public string? StartDate { get; set; }
        public string? ExpectedEndDate { get; set; }
        public int? Amount { get; set; }
    }
}
