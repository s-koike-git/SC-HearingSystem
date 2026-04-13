using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ProjectsController> _logger;

        public ProjectsController(AppDbContext context, ILogger<ProjectsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// 案件一覧取得
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Project>>> GetProjects()
        {
            var projects = await _context.Projects
                .OrderByDescending(p => p.UpdatedAt)
                .ToListAsync();

            return Ok(projects);
        }

        /// <summary>
        /// 案件詳細取得
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Project>> GetProject(int id)
        {
            var project = await _context.Projects
                .Include(p => p.Answers)
                .Include(p => p.Judgments)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
            {
                return NotFound(new { message = $"案件ID {id} が見つかりません" });
            }

            return Ok(project);
        }

        /// <summary>
        /// 案件作成
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Project>> CreateProject(Project project)
        {
            project.Status = "未着手";
            project.CreatedAt = DateTime.Now;
            project.UpdatedAt = DateTime.Now;

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"案件作成: {project.CompanyName}");

            return CreatedAtAction(nameof(GetProject), new { id = project.Id }, project);
        }

        /// <summary>
        /// 案件更新
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProject(int id, Project project)
        {
            if (id != project.Id)
            {
                return BadRequest(new { message = "IDが一致しません" });
            }

            var existingProject = await _context.Projects.FindAsync(id);
            if (existingProject == null)
            {
                return NotFound(new { message = $"案件ID {id} が見つかりません" });
            }

            existingProject.CompanyName = project.CompanyName;
            existingProject.Industry = project.Industry;
            existingProject.ContactPerson = project.ContactPerson;
            existingProject.PhoneNumber = project.PhoneNumber;
            existingProject.Email = project.Email;
            existingProject.Remarks = project.Remarks;
            existingProject.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"案件更新: {project.CompanyName}");

            return NoContent();
        }
        /// <summary>
        /// 案件ステータス更新
        /// </summary>
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Status))
            {
                return BadRequest("Status is required.");
            }

            if (!new[] { "未着手", "進行中", "完了", "保留" }.Contains(request.Status))
            {
                return BadRequest("Invalid status value.");
            }

            var project = await _context.Projects.FindAsync(id);
            if (project == null)
            {
                return NotFound();
            }

            project.Status = request.Status;
            project.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        public class UpdateStatusRequest
        {
            public string Status { get; set; } = string.Empty;
        }

        /// <summary>
        /// 案件削除
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(int id)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null)
            {
                return NotFound(new { message = $"案件ID {id} が見つかりません" });
            }

            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"案件削除: {project.CompanyName}");

            return NoContent();
        }
    }
}
