using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FlowProgramMappingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FlowProgramMappingsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// 全てのプログラムマッピングを取得
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FlowProgramMapping>>> GetAll()
        {
            var mappings = await _context.FlowProgramMappings
                .Where(m => m.IsActive)
                .OrderBy(m => m.DisplayOrder)
                .ToListAsync();

            return Ok(mappings);
        }

        /// <summary>
        /// IDでプログラムマッピングを取得
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<FlowProgramMapping>> GetById(int id)
        {
            var mapping = await _context.FlowProgramMappings.FindAsync(id);

            if (mapping == null)
            {
                return NotFound();
            }

            return Ok(mapping);
        }

        /// <summary>
        /// フロー工程IDでプログラムマッピングを取得
        /// </summary>
        [HttpGet("by-flow-step/{flowStepId}")]
        public async Task<ActionResult<IEnumerable<FlowProgramMapping>>> GetByFlowStep(string flowStepId)
        {
            var mappings = await _context.FlowProgramMappings
                .Where(m => m.FlowStepId == flowStepId && m.IsActive)
                .OrderBy(m => m.DisplayOrder)
                .ToListAsync();

            return Ok(mappings);
        }

        /// <summary>
        /// プログラムIDでプログラムマッピングを取得
        /// </summary>
        [HttpGet("by-program/{programId}")]
        public async Task<ActionResult<IEnumerable<FlowProgramMapping>>> GetByProgram(string programId)
        {
            var mappings = await _context.FlowProgramMappings
                .Where(m => m.ProgramId == programId && m.IsActive)
                .ToListAsync();

            return Ok(mappings);
        }

        /// <summary>
        /// プログラムマッピングを作成
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<FlowProgramMapping>> Create(FlowProgramMapping mapping)
        {
            mapping.CreatedAt = DateTime.Now;
            mapping.UpdatedAt = DateTime.Now;

            _context.FlowProgramMappings.Add(mapping);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = mapping.Id }, mapping);
        }

        /// <summary>
        /// プログラムマッピングを更新
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, FlowProgramMapping mapping)
        {
            if (id != mapping.Id)
            {
                return BadRequest();
            }

            mapping.UpdatedAt = DateTime.Now;

            _context.Entry(mapping).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!MappingExists(id))
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
        /// プログラムマッピングを削除
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var mapping = await _context.FlowProgramMappings.FindAsync(id);
            if (mapping == null)
            {
                return NotFound();
            }

            _context.FlowProgramMappings.Remove(mapping);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// 一括保存
        /// </summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<FlowProgramMapping> mappings)
        {
            foreach (var mapping in mappings)
            {
                mapping.CreatedAt = DateTime.Now;
                mapping.UpdatedAt = DateTime.Now;
            }

            _context.FlowProgramMappings.AddRange(mappings);
            await _context.SaveChangesAsync();

            return Ok(new { count = mappings.Count });
        }

        private bool MappingExists(int id)
        {
            return _context.FlowProgramMappings.Any(e => e.Id == id);
        }
    }
}
