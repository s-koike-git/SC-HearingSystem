using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    /// <summary>
    /// 業務プロセスフロー (第1階層) の接続定義 CRUD API
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class BusinessProcessFlowConnectionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BusinessProcessFlowConnectionsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BusinessProcessFlowConnection>>> GetAll()
        {
            var connections = await _context.BusinessProcessFlowConnections
                .Where(c => c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();
            return Ok(connections);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BusinessProcessFlowConnection>> GetById(int id)
        {
            var connection = await _context.BusinessProcessFlowConnections.FindAsync(id);
            if (connection == null) return NotFound();
            return Ok(connection);
        }

        [HttpGet("from/{fromStepId}")]
        public async Task<ActionResult<IEnumerable<BusinessProcessFlowConnection>>> GetByFromStep(string fromStepId)
        {
            var connections = await _context.BusinessProcessFlowConnections
                .Where(c => c.FromStepId == fromStepId && c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();
            return Ok(connections);
        }

        [HttpGet("to/{toStepId}")]
        public async Task<ActionResult<IEnumerable<BusinessProcessFlowConnection>>> GetByToStep(string toStepId)
        {
            var connections = await _context.BusinessProcessFlowConnections
                .Where(c => c.ToStepId == toStepId && c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();
            return Ok(connections);
        }

        [HttpPost]
        public async Task<ActionResult<BusinessProcessFlowConnection>> Create(BusinessProcessFlowConnection connection)
        {
            connection.CreatedAt = DateTime.Now;
            connection.UpdatedAt = DateTime.Now;
            _context.BusinessProcessFlowConnections.Add(connection);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = connection.Id }, connection);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, BusinessProcessFlowConnection connection)
        {
            if (id != connection.Id) return BadRequest();
            connection.UpdatedAt = DateTime.Now;
            _context.Entry(connection).State = EntityState.Modified;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ConnectionExists(id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var connection = await _context.BusinessProcessFlowConnections.FindAsync(id);
            if (connection == null) return NotFound();
            _context.BusinessProcessFlowConnections.Remove(connection);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<BusinessProcessFlowConnection> connections)
        {
            foreach (var c in connections)
            {
                c.CreatedAt = DateTime.Now;
                c.UpdatedAt = DateTime.Now;
            }
            _context.BusinessProcessFlowConnections.AddRange(connections);
            await _context.SaveChangesAsync();
            return Ok(new { count = connections.Count });
        }

        private bool ConnectionExists(int id)
        {
            return _context.BusinessProcessFlowConnections.Any(e => e.Id == id);
        }
    }
}
