using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SCHearing.API.Controllers
{
    /// <summary>
    /// お知らせAPIコントローラー
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class AnnouncementsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AnnouncementsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// 有効なお知らせ一覧を取得（メニュー画面用）
        /// </summary>
        /// <returns>有効なお知らせリスト</returns>
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<Announcement>>> GetActiveAnnouncements()
        {
            var announcements = await _context.Announcements
                .Where(a => a.IsActive && a.PublishedAt <= DateTime.Now)
                .OrderByDescending(a => a.Priority == "重要")
                .ThenByDescending(a => a.PublishedAt)
                .ToListAsync();

            return Ok(announcements);
        }

        /// <summary>
        /// すべてのお知らせを取得（管理画面用）
        /// </summary>
        /// <returns>すべてのお知らせリスト</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Announcement>>> GetAllAnnouncements()
        {
            var announcements = await _context.Announcements
                .OrderByDescending(a => a.PublishedAt)
                .ToListAsync();

            return Ok(announcements);
        }

        /// <summary>
        /// 特定のお知らせを取得
        /// </summary>
        /// <param name="id">お知らせID</param>
        /// <returns>お知らせ情報</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<Announcement>> GetAnnouncement(int id)
        {
            var announcement = await _context.Announcements.FindAsync(id);

            if (announcement == null)
            {
                return NotFound();
            }

            return Ok(announcement);
        }

        /// <summary>
        /// お知らせを新規作成
        /// </summary>
        /// <param name="announcement">お知らせ情報</param>
        /// <returns>作成されたお知らせ</returns>
        [HttpPost]
        public async Task<ActionResult<Announcement>> CreateAnnouncement(Announcement announcement)
        {
            announcement.CreatedAt = DateTime.Now;
            announcement.UpdatedAt = DateTime.Now;

            _context.Announcements.Add(announcement);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAnnouncement), new { id = announcement.Id }, announcement);
        }

        /// <summary>
        /// お知らせを更新
        /// </summary>
        /// <param name="id">お知らせID</param>
        /// <param name="announcement">更新するお知らせ情報</param>
        /// <returns></returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAnnouncement(int id, Announcement announcement)
        {
            if (id != announcement.Id)
            {
                return BadRequest();
            }

            announcement.UpdatedAt = DateTime.Now;

            _context.Entry(announcement).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AnnouncementExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        /// <summary>
        /// お知らせを削除
        /// </summary>
        /// <param name="id">お知らせID</param>
        /// <returns></returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAnnouncement(int id)
        {
            var announcement = await _context.Announcements.FindAsync(id);
            if (announcement == null)
            {
                return NotFound();
            }

            _context.Announcements.Remove(announcement);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool AnnouncementExists(int id)
        {
            return _context.Announcements.Any(e => e.Id == id);
        }
    }
}
