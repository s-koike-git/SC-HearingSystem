using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WorkTasksController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        public WorkTasksController(AppDbContext ctx) { _ctx = ctx; }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WorkTask>>> GetAll()
            => Ok(await _ctx.WorkTasks.OrderBy(t => t.No).ToListAsync());

        [HttpGet("{id}")]
        public async Task<ActionResult<WorkTask>> Get(int id)
        {
            var t = await _ctx.WorkTasks.FindAsync(id);
            return t == null ? NotFound() : Ok(t);
        }

        [HttpPost]
        public async Task<ActionResult<WorkTask>> Create([FromBody] WorkTaskDto dto)
        {
            var t = new WorkTask {
                No = dto.No, Category = dto.Category, Assignees = dto.Assignees,
                CustomerName = dto.CustomerName, TaskName = dto.TaskName, Status = dto.Status,
                StartDate = dto.StartDate, PlannedEndDate = dto.PlannedEndDate,
                ActualEndDate = dto.ActualEndDate, Progress = dto.Progress,
                Priority = dto.Priority, Notes = dto.Notes, Deliverable = dto.Deliverable,
                CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now,
            };
            _ctx.WorkTasks.Add(t);
            await _ctx.SaveChangesAsync();
            return Ok(t);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] WorkTaskDto dto)
        {
            var t = await _ctx.WorkTasks.FindAsync(id);
            if (t == null) return NotFound();
            t.No = dto.No; t.Category = dto.Category; t.Assignees = dto.Assignees;
            t.CustomerName = dto.CustomerName; t.TaskName = dto.TaskName; t.Status = dto.Status;
            t.StartDate = dto.StartDate; t.PlannedEndDate = dto.PlannedEndDate;
            t.ActualEndDate = dto.ActualEndDate; t.Progress = dto.Progress;
            t.Priority = dto.Priority; t.Notes = dto.Notes; t.Deliverable = dto.Deliverable;
            t.UpdatedAt = DateTime.Now;
            await _ctx.SaveChangesAsync();
            return Ok(t);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var t = await _ctx.WorkTasks.FindAsync(id);
            if (t == null) return NotFound();
            _ctx.WorkTasks.Remove(t);
            await _ctx.SaveChangesAsync();
            return NoContent();
        }
    }

    public class WorkTaskDto
    {
        public int No { get; set; }
        public string Category { get; set; } = "自社";
        public string Assignees { get; set; } = "";
        public string CustomerName { get; set; } = "";
        public string TaskName { get; set; } = "";
        public string Status { get; set; } = "未着手";
        public string? StartDate { get; set; }
        public string? PlannedEndDate { get; set; }
        public string? ActualEndDate { get; set; }
        public double Progress { get; set; }
        public string Priority { get; set; } = "中";
        public string Notes { get; set; } = "";
        public string Deliverable { get; set; } = "";
    }
}

// AppDbContext.csに追加: public DbSet<WorkTask> WorkTasks { get; set; }
