using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ConditionsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ConditionsController> _logger;

        public ConditionsController(AppDbContext context, ILogger<ConditionsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// 条件一覧取得
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Condition>>> GetConditions()
        {
            var conditions = await _context.Conditions
                .OrderBy(c => c.BusinessType)
                .ThenBy(c => c.QuestionNo)
                .ThenBy(c => c.DisplayOrder)
                .ToListAsync();

            return Ok(conditions);
        }

        /// <summary>
        /// 条件詳細取得
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Condition>> GetCondition(int id)
        {
            var condition = await _context.Conditions.FindAsync(id);

            if (condition == null)
            {
                return NotFound();
            }

            return Ok(condition);
        }

        /// <summary>
        /// 業務種別＋質問番号で条件取得
        /// </summary>
        [HttpGet("by-question")]
        public async Task<ActionResult<IEnumerable<Condition>>> GetConditionsByQuestion(
            [FromQuery] string businessType,
            [FromQuery] string questionNo)
        {
            var conditions = await _context.Conditions
                .Where(c => c.BusinessType == businessType && c.QuestionNo == questionNo)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            return Ok(conditions);
        }

        /// <summary>
        /// 条件追加
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Condition>> CreateCondition(Condition condition)
        {
            condition.CreatedAt = DateTime.Now;
            condition.UpdatedAt = DateTime.Now;

            _context.Conditions.Add(condition);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"条件追加: {condition.BusinessType} {condition.QuestionNo} -> {condition.ProgramId}");

            return CreatedAtAction(nameof(GetCondition), new { id = condition.Id }, condition);
        }

        /// <summary>
        /// 条件更新
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCondition(int id, Condition condition)
        {
            if (id != condition.Id)
            {
                return BadRequest();
            }

            var existingCondition = await _context.Conditions.FindAsync(id);
            if (existingCondition == null)
            {
                return NotFound();
            }

            existingCondition.BusinessType = condition.BusinessType;
            existingCondition.QuestionNo = condition.QuestionNo;
            existingCondition.QuestionText = condition.QuestionText;
            existingCondition.AnswerCondition = condition.AnswerCondition;
            existingCondition.ProgramId = condition.ProgramId;
            existingCondition.ProgramName = condition.ProgramName;
            existingCondition.IsStandard = condition.IsStandard;
            existingCondition.Remarks = condition.Remarks;
            existingCondition.DisplayOrder = condition.DisplayOrder;
            existingCondition.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"条件更新: {condition.BusinessType} {condition.QuestionNo}");

            return NoContent();
        }

        /// <summary>
        /// 条件削除
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCondition(int id)
        {
            var condition = await _context.Conditions.FindAsync(id);
            if (condition == null)
            {
                return NotFound();
            }

            _context.Conditions.Remove(condition);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"条件削除: {condition.BusinessType} {condition.QuestionNo} -> {condition.ProgramId}");

            return NoContent();
        }
    }
}
