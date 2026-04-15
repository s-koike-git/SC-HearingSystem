using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BusinessFlowStepsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BusinessFlowStepsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// 全ての業務フロー工程を取得
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BusinessFlowStep>>> GetAll()
        {
            var steps = await _context.BusinessFlowSteps
                .Where(s => s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .ToListAsync();

            return Ok(steps);
        }

        /// <summary>
        /// IDで業務フロー工程を取得
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<BusinessFlowStep>> GetById(int id)
        {
            var step = await _context.BusinessFlowSteps.FindAsync(id);

            if (step == null)
            {
                return NotFound();
            }

            return Ok(step);
        }

        /// <summary>
        /// 業務フロー工程を作成
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<BusinessFlowStep>> Create(BusinessFlowStep step)
        {
            step.CreatedAt = DateTime.Now;
            step.UpdatedAt = DateTime.Now;

            _context.BusinessFlowSteps.Add(step);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = step.Id }, step);
        }

        /// <summary>
        /// 業務フロー工程を更新
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, BusinessFlowStep step)
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
        /// 業務フロー工程を削除
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var step = await _context.BusinessFlowSteps.FindAsync(id);
            if (step == null)
            {
                return NotFound();
            }

            _context.BusinessFlowSteps.Remove(step);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// 一括保存（CSV一括登録用）
        /// </summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<BusinessFlowStep> steps)
        {
            foreach (var step in steps)
            {
                step.CreatedAt = DateTime.Now;
                step.UpdatedAt = DateTime.Now;
            }

            _context.BusinessFlowSteps.AddRange(steps);
            await _context.SaveChangesAsync();

            return Ok(new { count = steps.Count });
        }

        private bool StepExists(int id)
        {
            return _context.BusinessFlowSteps.Any(e => e.Id == id);
        }
    }
}
