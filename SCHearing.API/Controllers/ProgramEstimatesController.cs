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
    /// プログラム工数見積もりAPIコントローラー
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ProgramEstimatesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProgramEstimatesController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// ユーザーの見積もり一覧を取得
        /// </summary>
        /// <param name="userId">ユーザーID</param>
        /// <returns>見積もり一覧</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProgramEstimate>>> GetEstimates([FromQuery] int userId)
        {
            var estimates = await _context.ProgramEstimates
                .Where(e => e.UserId == userId)
                .Include(e => e.Items)
                .OrderByDescending(e => e.UpdatedAt)
                .ToListAsync();

            return Ok(estimates);
        }

        /// <summary>
        /// 特定の見積もりを取得
        /// </summary>
        /// <param name="id">見積もりID</param>
        /// <param name="userId">ユーザーID</param>
        /// <returns>見積もり情報</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<ProgramEstimate>> GetEstimate(int id, [FromQuery] int userId)
        {
            var estimate = await _context.ProgramEstimates
                .Include(e => e.Items.OrderBy(i => i.DisplayOrder))
                .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

            if (estimate == null)
            {
                return NotFound();
            }

            return Ok(estimate);
        }

        /// <summary>
        /// 見積もりを新規作成
        /// </summary>
        /// <param name="estimate">見積もり情報</param>
        /// <returns>作成された見積もり</returns>
        [HttpPost]
        public async Task<ActionResult<ProgramEstimate>> CreateEstimate(ProgramEstimate estimate)
        {
            estimate.CreatedAt = DateTime.Now;
            estimate.UpdatedAt = DateTime.Now;

            // 合計工数を計算
            estimate.TotalHours = estimate.Items.Sum(i => i.BaseWorkHours * i.Factor);

            _context.ProgramEstimates.Add(estimate);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEstimate), new { id = estimate.Id, userId = estimate.UserId }, estimate);
        }

        /// <summary>
        /// 見積もりを更新
        /// </summary>
        /// <param name="id">見積もりID</param>
        /// <param name="estimate">更新する見積もり情報</param>
        /// <returns></returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEstimate(int id, ProgramEstimate estimate)
        {
            if (id != estimate.Id)
            {
                return BadRequest();
            }

            // 既存の見積もりを取得（権限チェック）
            var existing = await _context.ProgramEstimates
                .Include(e => e.Items)
                .FirstOrDefaultAsync(e => e.Id == id && e.UserId == estimate.UserId);

            if (existing == null)
            {
                return NotFound();
            }

            // 既存の明細を削除
            _context.ProgramEstimateItems.RemoveRange(existing.Items);

            // 更新
            existing.Title = estimate.Title;
            existing.Description = estimate.Description;
            existing.UpdatedAt = DateTime.Now;
            existing.TotalHours = estimate.Items.Sum(i => i.BaseWorkHours * i.Factor);

            // 新しい明細を追加
            foreach (var item in estimate.Items)
            {
                item.EstimateId = id;
                _context.ProgramEstimateItems.Add(item);
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EstimateExists(id))
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
        /// 見積もりを削除
        /// </summary>
        /// <param name="id">見積もりID</param>
        /// <param name="userId">ユーザーID</param>
        /// <returns></returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEstimate(int id, [FromQuery] int userId)
        {
            var estimate = await _context.ProgramEstimates
                .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

            if (estimate == null)
            {
                return NotFound();
            }

            _context.ProgramEstimates.Remove(estimate);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool EstimateExists(int id)
        {
            return _context.ProgramEstimates.Any(e => e.Id == id);
        }
    }
}
