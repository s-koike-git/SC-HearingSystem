using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProgramsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProgramsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// プログラムマスタ一覧取得
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProgramMaster>>> GetPrograms()
        {
            var programs = await _context.Programs
                .OrderBy(p => p.ProgramId)
                .ToListAsync();

            return Ok(programs);
        }

        /// <summary>
        /// プログラムマスタ一括保存（CSVインポート用）
        /// </summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<ProgramMaster> programs)
        {
            // 全削除 → 再登録（マスタ前提）
            _context.Programs.RemoveRange(_context.Programs);
            await _context.SaveChangesAsync();

            _context.Programs.AddRange(programs);
            await _context.SaveChangesAsync();

            return Ok();
        }

        /// <summary>
        /// プログラム追加
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<ProgramMaster>> CreateProgram(ProgramMaster program)
        {
            program.CreatedAt = DateTime.Now;
            program.UpdatedAt = DateTime.Now;

            _context.Programs.Add(program);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPrograms), new { id = program.Id }, program);
        }

        /// <summary>
        /// プログラム更新
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProgram(int id, ProgramMaster program)
        {
            if (id != program.Id)
            {
                return BadRequest();
            }

            var existing = await _context.Programs.FindAsync(id);
            if (existing == null)
            {
                return NotFound();
            }

            existing.ProgramId = program.ProgramId;
            existing.ProgramName = program.ProgramName;
            existing.WorkHours = program.WorkHours;
            existing.ScreenId = program.ScreenId;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// プログラム削除
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProgram(int id)
        {
            var program = await _context.Programs.FindAsync(id);
            if (program == null)
            {
                return NotFound();
            }

            _context.Programs.Remove(program);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}