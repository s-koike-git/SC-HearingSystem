using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SystemFlowStepsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SystemFlowStepsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// 全てのシステムフロー工程を取得
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SystemFlowStep>>> GetAll()
        {
            var steps = await _context.SystemFlowSteps
                .Where(s => s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .ToListAsync();

            return Ok(steps);
        }

        /// <summary>
        /// IDでシステムフロー工程を取得
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<SystemFlowStep>> GetById(int id)
        {
            var step = await _context.SystemFlowSteps.FindAsync(id);

            if (step == null)
            {
                return NotFound();
            }

            return Ok(step);
        }

        /// <summary>
        /// 業務タイプでシステムフロー工程を取得
        /// </summary>
        [HttpGet("business/{businessType}")]
        public async Task<ActionResult<IEnumerable<SystemFlowStep>>> GetByBusinessType(string businessType)
        {
            var steps = await _context.SystemFlowSteps
                .Where(s => s.BusinessType == businessType && s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .ToListAsync();

            return Ok(steps);
        }

        /// <summary>
        /// システムフロー工程を作成
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<SystemFlowStep>> Create(SystemFlowStep step)
        {
            step.CreatedAt = DateTime.Now;
            step.UpdatedAt = DateTime.Now;

            _context.SystemFlowSteps.Add(step);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = step.Id }, step);
        }

        /// <summary>
        /// システムフロー工程を更新
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, SystemFlowStep step)
        {
            if (id != step.Id)
            {
                return BadRequest();
            }

            step.UpdatedAt = DateTime.Now;

            _context.Entry(step).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!StepExists(id))
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
        /// システムフロー工程を削除
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var step = await _context.SystemFlowSteps.FindAsync(id);
            if (step == null)
            {
                return NotFound();
            }

            _context.SystemFlowSteps.Remove(step);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// 一括保存
        /// </summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<SystemFlowStep> steps)
        {
            foreach (var step in steps)
            {
                step.CreatedAt = DateTime.Now;
                step.UpdatedAt = DateTime.Now;
            }

            _context.SystemFlowSteps.AddRange(steps);
            await _context.SaveChangesAsync();

            return Ok(new { count = steps.Count });
        }

        private bool StepExists(int id)
        {
            return _context.SystemFlowSteps.Any(e => e.Id == id);
        }
    }
}
