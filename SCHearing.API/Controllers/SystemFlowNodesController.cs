using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SystemFlowNodesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SystemFlowNodesController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// 全てのシステムフローノードを取得
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SystemFlowNode>>> GetAll(
            [FromQuery] string? flowStepId = null,
            [FromQuery] string? sourceType = null)
        {
            var query = _context.SystemFlowNodes.AsQueryable().Where(n => n.IsActive);

            if (!string.IsNullOrEmpty(flowStepId))
            {
                query = query.Where(n => n.FlowStepId == flowStepId);
            }

            if (!string.IsNullOrEmpty(sourceType))
            {
                query = query.Where(n => n.SourceType == sourceType);
            }

            var nodes = await query
                .OrderBy(n => n.FlowStepId)
                .ThenBy(n => n.DisplayOrder)
                .ToListAsync();

            return Ok(nodes);
        }

        /// <summary>
        /// IDでシステムフローノードを取得
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<SystemFlowNode>> GetById(int id)
        {
            var node = await _context.SystemFlowNodes.FindAsync(id);
            if (node == null) return NotFound();
            return Ok(node);
        }

        /// <summary>
        /// NodeIdでシステムフローノードを取得
        /// </summary>
        [HttpGet("by-node-id/{nodeId}")]
        public async Task<ActionResult<SystemFlowNode>> GetByNodeId(string nodeId)
        {
            var node = await _context.SystemFlowNodes
                .FirstOrDefaultAsync(n => n.NodeId == nodeId);
            if (node == null) return NotFound();
            return Ok(node);
        }

        /// <summary>
        /// 工程IDでシステムフローノードを取得
        /// </summary>
        [HttpGet("by-flow-step/{flowStepId}")]
        public async Task<ActionResult<IEnumerable<SystemFlowNode>>> GetByFlowStep(string flowStepId)
        {
            var nodes = await _context.SystemFlowNodes
                .Where(n => n.FlowStepId == flowStepId && n.IsActive)
                .OrderBy(n => n.DisplayOrder)
                .ToListAsync();

            return Ok(nodes);
        }

        /// <summary>
        /// システムフローノードを作成
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<SystemFlowNode>> Create(SystemFlowNode node)
        {
            node.CreatedAt = DateTime.Now;
            node.UpdatedAt = DateTime.Now;

            _context.SystemFlowNodes.Add(node);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = node.Id }, node);
        }

        /// <summary>
        /// システムフローノードを更新
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, SystemFlowNode node)
        {
            if (id != node.Id) return BadRequest();

            node.UpdatedAt = DateTime.Now;
            _context.Entry(node).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!NodeExists(id)) return NotFound();
                throw;
            }

            return NoContent();
        }

        /// <summary>
        /// 位置情報のみ更新（ReactFlow ドラッグ用、軽量）
        /// </summary>
        [HttpPut("{id}/position")]
        public async Task<IActionResult> UpdatePosition(int id, [FromBody] PositionDto dto)
        {
            var node = await _context.SystemFlowNodes.FindAsync(id);
            if (node == null) return NotFound();

            node.PositionX = dto.X;
            node.PositionY = dto.Y;
            node.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>
        /// 位置情報の一括更新（ReactFlow ドラッグ完了時用）
        /// </summary>
        [HttpPost("positions")]
        public async Task<IActionResult> UpdatePositionsBulk([FromBody] List<NodePositionDto> positions)
        {
            if (positions == null || positions.Count == 0)
            {
                return BadRequest(new { message = "positions が空です" });
            }

            var nodeIds = positions.Select(p => p.NodeId).ToList();
            var nodes = await _context.SystemFlowNodes
                .Where(n => nodeIds.Contains(n.NodeId))
                .ToListAsync();

            var now = DateTime.Now;
            var updatedCount = 0;

            foreach (var p in positions)
            {
                var node = nodes.FirstOrDefault(n => n.NodeId == p.NodeId);
                if (node != null)
                {
                    node.PositionX = p.X;
                    node.PositionY = p.Y;
                    node.UpdatedAt = now;
                    updatedCount++;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { count = updatedCount });
        }

        /// <summary>
        /// システムフローノードを削除
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var node = await _context.SystemFlowNodes.FindAsync(id);
            if (node == null) return NotFound();

            _context.SystemFlowNodes.Remove(node);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// 一括保存（CSV一括登録、データシード用）
        /// </summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulk(List<SystemFlowNode> nodes)
        {
            foreach (var node in nodes)
            {
                node.CreatedAt = DateTime.Now;
                node.UpdatedAt = DateTime.Now;
            }

            _context.SystemFlowNodes.AddRange(nodes);
            await _context.SaveChangesAsync();

            return Ok(new { count = nodes.Count });
        }

        private bool NodeExists(int id)
        {
            return _context.SystemFlowNodes.Any(e => e.Id == id);
        }

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
