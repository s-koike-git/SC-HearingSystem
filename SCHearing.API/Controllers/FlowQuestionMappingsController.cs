using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FlowQuestionMappingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FlowQuestionMappingsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// 全ての質問マッピングを取得
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FlowQuestionMapping>>> GetAll()
        {
            var mappings = await _context.FlowQuestionMappings
                .Where(m => m.IsActive)
                .ToListAsync();

            return Ok(mappings);
        }

        /// <summary>
        /// IDで質問マッピングを取得
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<FlowQuestionMapping>> GetById(int id)
        {
            var mapping = await _context.FlowQuestionMappings.FindAsync(id);

            if (mapping == null)
            {
                return NotFound();
            }

            return Ok(mapping);
        }

        /// <summary>
        /// 質問で質問マッピングを取得
        /// </summary>
        [HttpGet("by-question")]
        public async Task<ActionResult<IEnumerable<FlowQuestionMapping>>> GetByQuestion(
            [FromQuery] string businessType, 
            [FromQuery] string questionNo)
        {
            var mappings = await _context.FlowQuestionMappings
                .Where(m => m.BusinessType == businessType && 
                           m.QuestionNo == questionNo && 
                           m.IsActive)
                .OrderBy(m => m.Priority)
                .ToListAsync();

            return Ok(mappings);
        }

        /// <summary>
        /// フロー工程IDで質問マッピングを取得
        /// </summary>
        [HttpGet("by-flow-step/{flowStepId}")]
        public async Task<ActionResult<IEnumerable<FlowQuestionMapping>>> GetByFlowStep(string flowStepId)
        {
            var mappings = await _context.FlowQuestionMappings
                .Where(m => m.FlowStepId == flowStepId && m.IsActive)
                .ToListAsync();

            return Ok(mappings);
        }

        /// <summary>
        /// 質問マッピングを作成
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<FlowQuestionMapping>> Create(FlowQuestionMapping mapping)
        {
            mapping.CreatedAt = DateTime.Now;
            mapping.UpdatedAt = DateTime.Now;

            _context.FlowQuestionMappings.Add(mapping);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = mapping.Id }, mapping);
        }

        /// <summary>
        /// 質問マッピングを更新
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, FlowQuestionMapping mapping)
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
        /// 質問マッピングを削除
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var mapping = await _context.FlowQuestionMappings.FindAsync(id);
            if (mapping == null)
            {
                return NotFound();
            }

            _context.FlowQuestionMappings.Remove(mapping);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// 一括保存
        /// </summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<FlowQuestionMapping> mappings)
        {
            foreach (var mapping in mappings)
            {
                mapping.CreatedAt = DateTime.Now;
                mapping.UpdatedAt = DateTime.Now;
            }

            _context.FlowQuestionMappings.AddRange(mappings);
            await _context.SaveChangesAsync();

            return Ok(new { count = mappings.Count });
        }

        private bool MappingExists(int id)
        {
            return _context.FlowQuestionMappings.Any(e => e.Id == id);
        }
    }
}
