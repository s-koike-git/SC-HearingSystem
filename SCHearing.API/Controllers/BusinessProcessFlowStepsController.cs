using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    /// <summary>
    /// 業務プロセスフロー (第1階層) のCRUD API
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class BusinessProcessFlowStepsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BusinessProcessFlowStepsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>全ての業務プロセスを取得</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BusinessProcessFlowStep>>> GetAll(
            [FromQuery] string? category = null)
        {
            var query = _context.BusinessProcessFlowSteps.AsQueryable().Where(s => s.IsActive);

            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(s => s.Category == category);
            }

            var steps = await query
                .OrderBy(s => s.DisplayOrder)
                .ToListAsync();

            return Ok(steps);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BusinessProcessFlowStep>> GetById(int id)
        {
            var step = await _context.BusinessProcessFlowSteps.FindAsync(id);
            if (step == null) return NotFound();
            return Ok(step);
        }

        /// <summary>StepIdで業務プロセスを取得</summary>
        [HttpGet("by-step-id/{stepId}")]
        public async Task<ActionResult<BusinessProcessFlowStep>> GetByStepId(string stepId)
        {
            var step = await _context.BusinessProcessFlowSteps
                .FirstOrDefaultAsync(s => s.StepId == stepId);
            if (step == null) return NotFound();
            return Ok(step);
        }

        /// <summary>カテゴリで業務プロセスを取得</summary>
        [HttpGet("by-category/{category}")]
        public async Task<ActionResult<IEnumerable<BusinessProcessFlowStep>>> GetByCategory(string category)
        {
            var steps = await _context.BusinessProcessFlowSteps
                .Where(s => s.Category == category && s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .ToListAsync();
            return Ok(steps);
        }

        [HttpPost]
        public async Task<ActionResult<BusinessProcessFlowStep>> Create(BusinessProcessFlowStep step)
        {
            step.CreatedAt = DateTime.Now;
            step.UpdatedAt = DateTime.Now;
            _context.BusinessProcessFlowSteps.Add(step);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = step.Id }, step);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, BusinessProcessFlowStep step)
        {
            if (id != step.Id) return BadRequest();
            step.UpdatedAt = DateTime.Now;
            _context.Entry(step).State = EntityState.Modified;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!StepExists(id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        /// <summary>位置情報のみ更新（ReactFlow ドラッグ用）</summary>
        [HttpPut("{id}/position")]
        public async Task<IActionResult> UpdatePosition(int id, [FromBody] PositionDto dto)
        {
            var step = await _context.BusinessProcessFlowSteps.FindAsync(id);
            if (step == null) return NotFound();
            step.PositionX = dto.X;
            step.PositionY = dto.Y;
            step.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>位置情報の一括更新</summary>
        [HttpPost("positions")]
        public async Task<IActionResult> UpdatePositionsBulk([FromBody] List<StepPositionDto> positions)
        {
            if (positions == null || positions.Count == 0)
                return BadRequest(new { message = "positions が空です" });

            var stepIds = positions.Select(p => p.StepId).ToList();
            var steps = await _context.BusinessProcessFlowSteps
                .Where(s => stepIds.Contains(s.StepId))
                .ToListAsync();

            var now = DateTime.Now;
            var updated = 0;
            foreach (var p in positions)
            {
                var step = steps.FirstOrDefault(s => s.StepId == p.StepId);
                if (step != null)
                {
                    step.PositionX = p.X;
                    step.PositionY = p.Y;
                    step.UpdatedAt = now;
                    updated++;
                }
            }
            await _context.SaveChangesAsync();
            return Ok(new { count = updated });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var step = await _context.BusinessProcessFlowSteps.FindAsync(id);
            if (step == null) return NotFound();
            _context.BusinessProcessFlowSteps.Remove(step);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<BusinessProcessFlowStep> steps)
        {
            foreach (var s in steps)
            {
                s.CreatedAt = DateTime.Now;
                s.UpdatedAt = DateTime.Now;
            }
            _context.BusinessProcessFlowSteps.AddRange(steps);
            await _context.SaveChangesAsync();
            return Ok(new { count = steps.Count });
        }

        private bool StepExists(int id)
        {
            return _context.BusinessProcessFlowSteps.Any(e => e.Id == id);
        }

        public class PositionDto
        {
            public double X { get; set; }
            public double Y { get; set; }
        }
        public class StepPositionDto
        {
            public string StepId { get; set; } = string.Empty;
            public double X { get; set; }
            public double Y { get; set; }
        }
    }
}
