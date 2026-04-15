using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FlowConnectionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FlowConnectionsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// 全てのフロー接続を取得
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FlowConnection>>> GetAll()
        {
            var connections = await _context.FlowConnections
                .Where(c => c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            return Ok(connections);
        }

        /// <summary>
        /// IDでフロー接続を取得
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<FlowConnection>> GetById(int id)
        {
            var connection = await _context.FlowConnections.FindAsync(id);

            if (connection == null)
            {
                return NotFound();
            }

            return Ok(connection);
        }

        /// <summary>
        /// 接続元ノードIDでフロー接続を取得
        /// </summary>
        [HttpGet("from/{fromNodeId}")]
        public async Task<ActionResult<IEnumerable<FlowConnection>>> GetByFromNode(string fromNodeId)
        {
            var connections = await _context.FlowConnections
                .Where(c => c.FromNodeId == fromNodeId && c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            return Ok(connections);
        }

        /// <summary>
        /// 接続先ノードIDでフロー接続を取得
        /// </summary>
        [HttpGet("to/{toNodeId}")]
        public async Task<ActionResult<IEnumerable<FlowConnection>>> GetByToNode(string toNodeId)
        {
            var connections = await _context.FlowConnections
                .Where(c => c.ToNodeId == toNodeId && c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            return Ok(connections);
        }

        /// <summary>
        /// フロー接続を作成
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<FlowConnection>> Create(FlowConnection connection)
        {
            connection.CreatedAt = DateTime.Now;
            connection.UpdatedAt = DateTime.Now;

            _context.FlowConnections.Add(connection);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = connection.Id }, connection);
        }

        /// <summary>
        /// フロー接続を更新
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, FlowConnection connection)
        {
            if (id != connection.Id)
            {
                return BadRequest();
            }

            connection.UpdatedAt = DateTime.Now;

            _context.Entry(connection).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ConnectionExists(id))
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
        /// フロー接続を削除
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var connection = await _context.FlowConnections.FindAsync(id);
            if (connection == null)
            {
                return NotFound();
            }

            _context.FlowConnections.Remove(connection);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// 一括保存
        /// </summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<FlowConnection> connections)
        {
            foreach (var connection in connections)
            {
                connection.CreatedAt = DateTime.Now;
                connection.UpdatedAt = DateTime.Now;
            }

            _context.FlowConnections.AddRange(connections);
            await _context.SaveChangesAsync();

            return Ok(new { count = connections.Count });
        }

        private bool ConnectionExists(int id)
        {
            return _context.FlowConnections.Any(e => e.Id == id);
        }
    }
}
