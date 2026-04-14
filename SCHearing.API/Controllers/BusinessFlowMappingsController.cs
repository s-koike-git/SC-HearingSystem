using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BusinessFlowMappingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BusinessFlowMappingsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// すべてのマッピングを取得
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BusinessFlowMapping>>> GetAll()
        {
            var mappings = await _context.BusinessFlowMappings
                .Where(m => m.IsActive == 1)
                .OrderBy(m => m.DisplayOrder)
                .ToListAsync();

            return Ok(new { success = true, data = mappings });
        }

        /// <summary>
        /// 特定の業務タイプのマッピングを取得
        /// </summary>
        [HttpGet("business-type/{businessType}")]
        public async Task<ActionResult<IEnumerable<BusinessFlowMapping>>> GetByBusinessType(string businessType)
        {
            var mappings = await _context.BusinessFlowMappings
                .Where(m => m.BusinessType == businessType && m.IsActive == 1)
                .OrderBy(m => m.DisplayOrder)
                .ToListAsync();

            return Ok(new { success = true, data = mappings });
        }

        /// <summary>
        /// マッピング登録
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<BusinessFlowMapping>> Create(BusinessFlowMapping mapping)
        {
            mapping.CreatedAt = DateTime.Now;
            mapping.UpdatedAt = DateTime.Now;

            _context.BusinessFlowMappings.Add(mapping);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = mapping });
        }

        /// <summary>
        /// マッピング更新
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, BusinessFlowMapping mapping)
        {
            if (id != mapping.Id)
            {
                return BadRequest(new { success = false, message = "IDが一致しません" });
            }

            mapping.UpdatedAt = DateTime.Now;
            _context.Entry(mapping).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await MappingExists(id))
                {
                    return NotFound(new { success = false, message = "マッピングが見つかりません" });
                }
                throw;
            }

            return Ok(new { success = true, data = mapping });
        }

        /// <summary>
        /// マッピング削除
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var mapping = await _context.BusinessFlowMappings.FindAsync(id);
            if (mapping == null)
            {
                return NotFound(new { success = false, message = "マッピングが見つかりません" });
            }

            _context.BusinessFlowMappings.Remove(mapping);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "削除しました" });
        }

        private async Task<bool> MappingExists(int id)
        {
            return await _context.BusinessFlowMappings.AnyAsync(e => e.Id == id);
        }
    }
}
