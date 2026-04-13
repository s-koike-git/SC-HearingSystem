using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;
using SCHearing.API.Services;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class JudgmentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IJudgmentService _judgmentService;
        private readonly ILogger<JudgmentsController> _logger;

        public JudgmentsController(
            AppDbContext context,
            IJudgmentService judgmentService,
            ILogger<JudgmentsController> logger)
        {
            _context = context;
            _judgmentService = judgmentService;
            _logger = logger;
        }

        /// <summary>
        /// 案件の判定結果取得
        /// </summary>
        [HttpGet("project/{projectId}")]
        public async Task<ActionResult<IEnumerable<Judgment>>> GetJudgmentsByProject(int projectId)
        {
            var judgments = await _context.Judgments
                .Where(j => j.ProjectId == projectId && j.IsUsed)
                .OrderBy(j => j.BusinessType)
                .ThenBy(j => j.ProgramId)
                .ToListAsync();

            return Ok(judgments);
        }

        /// <summary>
        /// 判定再実行
        /// </summary>
        [HttpPost("project/{projectId}/re-execute")]
        public async Task<ActionResult> ReExecuteJudgments(int projectId)
        {
            try
            {
                var success = await _judgmentService.ReExecuteAllJudgmentsAsync(projectId);

                if (!success)
                {
                    return StatusCode(500, new { message = "判定再実行に失敗しました" });
                }

                var judgments = await _context.Judgments
                    .Where(j => j.ProjectId == projectId && j.IsUsed)
                    .ToListAsync();

                _logger.LogInformation($"判定再実行完了: ProjectId={projectId}, 結果={judgments.Count}件");

                return Ok(new
                {
                    message = "判定を再実行しました",
                    count = judgments.Count,
                    judgments
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"判定再実行エラー: ProjectId={projectId}");
                return StatusCode(500, new { message = "判定再実行中にエラーが発生しました", error = ex.Message });
            }
        }
    }
}
