using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MasterItemsController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        public MasterItemsController(AppDbContext ctx) { _ctx = ctx; }

        [HttpGet]
        public async Task<IActionResult> GetAll()
            => Ok(await _ctx.MasterItems.OrderBy(m => m.Category).ThenBy(m => m.SortOrder).ToListAsync());

        [HttpGet("category/{category}")]
        public async Task<IActionResult> GetByCategory(string category)
            => Ok(await _ctx.MasterItems.Where(m => m.Category == category && m.IsActive).OrderBy(m => m.SortOrder).ToListAsync());

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MasterItemDto dto)
        {
            var maxOrder = await _ctx.MasterItems.Where(m => m.Category == dto.Category).MaxAsync(m => (int?)m.SortOrder) ?? 0;
            var item = new MasterItem { Category=dto.Category, Value=dto.Value, SortOrder=maxOrder+1, IsActive=true, CreatedAt=DateTime.Now };
            _ctx.MasterItems.Add(item); await _ctx.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] MasterItemDto dto)
        {
            var item = await _ctx.MasterItems.FindAsync(id);
            if (item == null) return NotFound();
            item.Value = dto.Value; item.SortOrder = dto.SortOrder; item.IsActive = dto.IsActive;
            await _ctx.SaveChangesAsync();
            return Ok(item);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _ctx.MasterItems.FindAsync(id);
            if (item == null) return NotFound();
            _ctx.MasterItems.Remove(item); await _ctx.SaveChangesAsync();
            return NoContent();
        }
    }

    public class MasterItemDto
    {
        public string Category { get; set; } = "";
        public string Value { get; set; } = "";
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
