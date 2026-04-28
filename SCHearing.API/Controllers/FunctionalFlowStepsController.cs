using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    /// <summary>
    /// 機能フロー (第3階層) のCRUD API
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class FunctionalFlowStepsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FunctionalFlowStepsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FunctionalFlowStep>>> GetAll(
            [FromQuery] string? businessFlowStepId = null,
            [FromQuery] string? businessProcessStepId = null)
        {
            var query = _context.FunctionalFlowSteps.AsQueryable().Where(s => s.IsActive);

            if (!string.IsNullOrEmpty(businessFlowStepId))
                query = query.Where(s => s.BusinessFlowStepId == businessFlowStepId);

            if (!string.IsNullOrEmpty(businessProcessStepId))
                query = query.Where(s => s.BusinessProcessStepId == businessProcessStepId);

            var steps = await query.OrderBy(s => s.DisplayOrder).ToListAsync();
            return Ok(steps);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FunctionalFlowStep>> GetById(int id)
        {
            var step = await _context.FunctionalFlowSteps.FindAsync(id);
            if (step == null) return NotFound();
            return Ok(step);
        }

        [HttpGet("by-step-id/{stepId}")]
        public async Task<ActionResult<IEnumerable<FunctionalFlowStep>>> GetByStepId(string stepId)
        {
            var steps = await _context.FunctionalFlowSteps
                .Where(s => s.StepId == stepId && s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .ToListAsync();
            return Ok(steps);
        }

        [HttpPost]
        public async Task<ActionResult<FunctionalFlowStep>> Create(FunctionalFlowStep step)
        {
            step.CreatedAt = DateTime.Now;
            step.UpdatedAt = DateTime.Now;
            _context.FunctionalFlowSteps.Add(step);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = step.Id }, step);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, FunctionalFlowStep step)
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

        /// <summary>位置情報のみ更新</summary>
        [HttpPut("{id}/position")]
        public async Task<IActionResult> UpdatePosition(int id, [FromBody] PositionDto dto)
        {
            var step = await _context.FunctionalFlowSteps.FindAsync(id);
            if (step == null) return NotFound();
            step.PositionX = dto.X;
            step.PositionY = dto.Y;
            step.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("positions")]
        public async Task<IActionResult> UpdatePositionsBulk([FromBody] List<NodePositionDto> positions)
        {
            if (positions == null || positions.Count == 0)
                return BadRequest(new { message = "positions が空です" });

            var nodeIds = positions.Select(p => p.NodeId).ToList();
            var nodes = await _context.FunctionalFlowSteps
                .Where(s => nodeIds.Contains(s.NodeId))
                .ToListAsync();

            var now = DateTime.Now;
            var updated = 0;
            foreach (var p in positions)
            {
                var node = nodes.FirstOrDefault(s => s.NodeId == p.NodeId);
                if (node != null)
                {
                    node.PositionX = p.X;
                    node.PositionY = p.Y;
                    node.UpdatedAt = now;
                    updated++;
                }
            }
            await _context.SaveChangesAsync();
            return Ok(new { count = updated });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var step = await _context.FunctionalFlowSteps.FindAsync(id);
            if (step == null) return NotFound();
            _context.FunctionalFlowSteps.Remove(step);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<FunctionalFlowStep> steps)
        {
            foreach (var s in steps)
            {
                s.CreatedAt = DateTime.Now;
                s.UpdatedAt = DateTime.Now;
            }
            _context.FunctionalFlowSteps.AddRange(steps);
            await _context.SaveChangesAsync();
            return Ok(new { count = steps.Count });
        }

        private bool StepExists(int id) => _context.FunctionalFlowSteps.Any(e => e.Id == id);

        public class PositionDto
        {
            public double X { get; set; }
            public double Y { get; set; }
        }
        public class NodePositionDto
        {
            public string NodeId { get; set; } = string.Empty;
            public double X { get; set; }
            public double Y { get; set; }
        }
    }
}
