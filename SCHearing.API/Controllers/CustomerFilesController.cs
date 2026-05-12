using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomerFilesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly string _uploadRoot;

        public CustomerFilesController(AppDbContext context, IWebHostEnvironment env, IConfiguration config)
        {
            _context = context;
            _env = env;
            // appsettings.json の UploadPath か、デフォルトで /var/www/sc-hearing/uploads
            _uploadRoot = config["UploadPath"] ?? Path.Combine("/var/www/sc-hearing", "uploads");
            Directory.CreateDirectory(_uploadRoot);
        }

        // ─── ファイル一覧取得 ──────────────────────────────────
        [HttpGet("customer/{customerId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetByCustomer(int customerId)
        {
            var files = await _context.CustomerFiles
                .Where(f => f.CustomerId == customerId)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();

            return Ok(files.Select(f => new {
                f.Id, f.CustomerId, f.ProjectId, f.FileName,
                f.FileType, f.FileSize, f.Description, f.UploadedBy,
                createdAt = f.CreatedAt.ToString("yyyy/MM/dd HH:mm"),
            }));
        }

        // ─── アップロード ──────────────────────────────────────
        [HttpPost("upload/{customerId}")]
        public async Task<IActionResult> Upload(int customerId, [FromForm] IFormFile file,
            [FromForm] string? description, [FromForm] string? uploadedBy, [FromForm] int? projectId)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "ファイルが選択されていません" });

            const long MaxSize = 20 * 1024 * 1024; // 20MB
            if (file.Length > MaxSize)
                return BadRequest(new { message = "ファイルサイズは20MB以下にしてください" });

            var ext = Path.GetExtension(file.FileName);
            var storedName = $"{Guid.NewGuid()}{ext}";
            var customerDir = Path.Combine(_uploadRoot, customerId.ToString());
            Directory.CreateDirectory(customerDir);
            var filePath = Path.Combine(customerDir, storedName);

            using (var stream = new FileStream(filePath, FileMode.Create))
                await file.CopyToAsync(stream);

            var entity = new CustomerFile {
                CustomerId  = customerId,
                ProjectId   = projectId,
                FileName    = file.FileName,
                StoredName  = storedName,
                FileType    = file.ContentType,
                FileSize    = file.Length,
                Description = description,
                UploadedBy  = uploadedBy ?? "不明",
                CreatedAt   = DateTime.Now,
            };
            _context.CustomerFiles.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new {
                entity.Id, entity.CustomerId, entity.FileName,
                entity.FileType, entity.FileSize, entity.Description,
                createdAt = entity.CreatedAt.ToString("yyyy/MM/dd HH:mm"),
            });
        }

        // ─── ダウンロード ──────────────────────────────────────
        [HttpGet("{id}/download")]
        public async Task<IActionResult> Download(int id)
        {
            var file = await _context.CustomerFiles.FindAsync(id);
            if (file == null) return NotFound();

            var filePath = Path.Combine(_uploadRoot, file.CustomerId.ToString(), file.StoredName);
            if (!System.IO.File.Exists(filePath))
                return NotFound(new { message = "ファイルが見つかりません" });

            var bytes = await System.IO.File.ReadAllBytesAsync(filePath);
            var contentType = string.IsNullOrEmpty(file.FileType) ? "application/octet-stream" : file.FileType;
            return File(bytes, contentType, file.FileName);
        }

        // ─── 削除 ──────────────────────────────────────────────
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var file = await _context.CustomerFiles.FindAsync(id);
            if (file == null) return NotFound();

            var filePath = Path.Combine(_uploadRoot, file.CustomerId.ToString(), file.StoredName);
            if (System.IO.File.Exists(filePath))
                System.IO.File.Delete(filePath);

            _context.CustomerFiles.Remove(file);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
