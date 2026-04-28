using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    /// <summary>
    /// 業務フロー (第2階層: 業務処理単位) のCRUD API
    /// F5で業務処理単位用に再構成
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class BusinessFlowStepsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BusinessFlowStepsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BusinessFlowStep>>> GetAll(
            [FromQuery] string? businessProcessStepId = null)
        {
            var query = _context.BusinessFlowSteps.AsQueryable().Where(s => s.IsActive);

            if (!string.IsNullOrEmpty(businessProcessStepId))
                query = query.Where(s => s.BusinessProcessStepId == businessProcessStepId);

            var steps = await query.OrderBy(s => s.DisplayOrder).ToListAsync();
            return Ok(steps);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BusinessFlowStep>> GetById(int id)
        {
            var step = await _context.BusinessFlowSteps.FindAsync(id);
            if (step == null) return NotFound();
            return Ok(step);
        }

        [HttpGet("by-step-id/{stepId}")]
        public async Task<ActionResult<BusinessFlowStep>> GetByStepId(string stepId)
        {
            var step = await _context.BusinessFlowSteps
                .FirstOrDefaultAsync(s => s.StepId == stepId);
            if (step == null) return NotFound();
            return Ok(step);
        }

        [HttpGet("by-process/{businessProcessStepId}")]
        public async Task<ActionResult<IEnumerable<BusinessFlowStep>>> GetByProcess(string businessProcessStepId)
        {
            var steps = await _context.BusinessFlowSteps
                .Where(s => s.BusinessProcessStepId == businessProcessStepId && s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .ToListAsync();
            return Ok(steps);
        }

        [HttpPost]
        public async Task<ActionResult<BusinessFlowStep>> Create(BusinessFlowStep step)
        {
            step.CreatedAt = DateTime.Now;
            step.UpdatedAt = DateTime.Now;
            _context.BusinessFlowSteps.Add(step);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = step.Id }, step);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, BusinessFlowStep step)
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

        [HttpPut("{id}/position")]
        public async Task<IActionResult> UpdatePosition(int id, [FromBody] PositionDto dto)
        {
            var step = await _context.BusinessFlowSteps.FindAsync(id);
            if (step == null) return NotFound();
            step.PositionX = dto.X;
            step.PositionY = dto.Y;
            step.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("positions")]
        public async Task<IActionResult> UpdatePositionsBulk([FromBody] List<StepPositionDto> positions)
        {
            if (positions == null || positions.Count == 0)
                return BadRequest(new { message = "positions が空です" });

            var stepIds = positions.Select(p => p.StepId).ToList();
            var steps = await _context.BusinessFlowSteps
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
            var step = await _context.BusinessFlowSteps.FindAsync(id);
            if (step == null) return NotFound();
            _context.BusinessFlowSteps.Remove(step);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<BusinessFlowStep> steps)
        {
            foreach (var s in steps)
            {
                s.CreatedAt = DateTime.Now;
                s.UpdatedAt = DateTime.Now;
            }
            _context.BusinessFlowSteps.AddRange(steps);
            await _context.SaveChangesAsync();
            return Ok(new { count = steps.Count });
        }

        private bool StepExists(int id) => _context.BusinessFlowSteps.Any(e => e.Id == id);

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
