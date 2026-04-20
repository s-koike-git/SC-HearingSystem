// =====================================================
// Controllers/InquiriesController.cs
// =====================================================
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InquiriesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InquiriesController(AppDbContext context)
        {
            _context = context;
        }

        // ─── 一覧取得 ────────────────────────────────────────────
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Inquiry>>> GetAll()
        {
            return await _context.Inquiries
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }

        // ─── 1件取得 ─────────────────────────────────────────────
        [HttpGet("{id}")]
        public async Task<ActionResult<Inquiry>> GetById(int id)
        {
            var item = await _context.Inquiries.FindAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        // ─── 新規登録 ─────────────────────────────────────────────
        [HttpPost]
        public async Task<ActionResult<Inquiry>> Create([FromBody] InquiryCreateDto dto)
        {
            // ユーザー名はリクエストBodyから受け取る（JWTトークン不使用のため）
            var userName = dto.CreatedBy ?? "不明";

            var inquiry = new Inquiry
            {
                Title     = dto.Title,
                Content   = dto.Content,
                ImageData = dto.ImageData,
                Status    = "未対応",
                CreatedBy = userName,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
            };

            _context.Inquiries.Add(inquiry);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = inquiry.Id }, inquiry);
        }

        // ─── 内容編集（管理者のみ：フロントエンドで制御） ────────────
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] InquiryUpdateDto dto)
        {
            var item = await _context.Inquiries.FindAsync(id);
            if (item == null) return NotFound();

            item.Title = dto.Title;
            item.Content = dto.Content;
            item.ImageData = dto.ImageData;
            item.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(item);
        }

        // ─── ステータス変更（管理者のみ：フロントエンドで制御） ────────
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] InquiryStatusDto dto)
        {
            var item = await _context.Inquiries.FindAsync(id);
            if (item == null) return NotFound();

            item.Status = dto.Status;
            item.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(item);
        }


        // ─── 削除 ────────────────────────────────────────────────
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.Inquiries.FindAsync(id);
            if (item == null) return NotFound();

            _context.Inquiries.Remove(item);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    // ─── DTO ─────────────────────────────────────────────────────
    public class InquiryCreateDto
    {
        public string Title      { get; set; } = string.Empty;
        public string Content    { get; set; } = string.Empty;
        public string? ImageData { get; set; }
        public string? CreatedBy { get; set; }  // フロントエンドからログインユーザー名を受け取る
    }

    public class InquiryUpdateDto
    {
        public string Title   { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? ImageData { get; set; }
    }

    public class InquiryStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }
}
