using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WorkTaskFilesController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        private readonly IConfiguration _cfg;
        public WorkTaskFilesController(AppDbContext ctx, IConfiguration cfg) { _ctx = ctx; _cfg = cfg; }

        [HttpGet("task/{taskId}")]
        public async Task<IActionResult> GetByTask(int taskId)
            => Ok(await _ctx.WorkTaskFiles.Where(f => f.WorkTaskId == taskId).OrderBy(f => f.CreatedAt).ToListAsync());

        [HttpPost("task/{taskId}")]
        public async Task<IActionResult> Upload(int taskId, IFormFile file, [FromForm] string? uploadedBy)
        {
            if (file == null || file.Length == 0) return BadRequest("ファイルがありません");
            var uploadPath = _cfg["UploadPath"] ?? "/var/www/sc-hearing/uploads";
            var dir = Path.Combine(uploadPath, "worktasks", taskId.ToString());
            Directory.CreateDirectory(dir);
            var safe = Path.GetFileName(file.FileName);
            var path = Path.Combine(dir, $"{Guid.NewGuid()}_{safe}");
            using (var s = new FileStream(path, FileMode.Create)) await file.CopyToAsync(s);
            var f = new WorkTaskFile { WorkTaskId=taskId, FileName=safe, FileType=file.ContentType, FileSize=file.Length, UploadedBy=uploadedBy??"", FilePath=path, CreatedAt=DateTime.Now };
            _ctx.WorkTaskFiles.Add(f); await _ctx.SaveChangesAsync();
            return Ok(f);
        }

        [HttpGet("{id}/download")]
        public async Task<IActionResult> Download(int id)
        {
            var f = await _ctx.WorkTaskFiles.FindAsync(id);
            if (f == null) return NotFound();
            if (!System.IO.File.Exists(f.FilePath)) return NotFound();
            return PhysicalFile(f.FilePath, string.IsNullOrEmpty(f.FileType)?"application/octet-stream":f.FileType, f.FileName);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var f = await _ctx.WorkTaskFiles.FindAsync(id);
            if (f == null) return NotFound();
            if (System.IO.File.Exists(f.FilePath)) System.IO.File.Delete(f.FilePath);
            _ctx.WorkTaskFiles.Remove(f); await _ctx.SaveChangesAsync();
            return NoContent();
        }
    }
}
