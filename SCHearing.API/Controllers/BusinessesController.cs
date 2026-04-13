using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BusinessesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BusinessesController(AppDbContext context)
        {
            _context = context;
        }

        // 一覧取得
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Business>>> GetBusinesses()
        {
            return await _context.Businesses
                .OrderBy(b => b.DisplayOrder)
                .ToListAsync();
        }

        // 一括保存（CSVインポート用）
        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<Business> businesses)
        {
            _context.Businesses.RemoveRange(_context.Businesses);
            await _context.SaveChangesAsync();

            _context.Businesses.AddRange(businesses);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}