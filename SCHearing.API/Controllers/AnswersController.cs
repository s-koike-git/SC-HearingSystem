using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;
using SCHearing.API.Services;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnswersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IJudgmentService _judgmentService;
        private readonly ILogger<AnswersController> _logger;

        public AnswersController(
            AppDbContext context,
            IJudgmentService judgmentService,
            ILogger<AnswersController> logger)
        {
            _context = context;
            _judgmentService = judgmentService;
            _logger = logger;
        }

        [HttpGet("project/{projectId}")]
        public async Task<ActionResult<IEnumerable<Answer>>> GetAnswersByProject(int projectId)
        {
            try
            {
                var answers = await _context.Answers
                    .Where(a => a.ProjectId == projectId)
                    .OrderBy(a => a.BusinessType)
                    .ThenBy(a => a.QuestionNo)
                    .ToListAsync();

                return Ok(answers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"回答取得エラー: ProjectId={projectId}");
                return StatusCode(500, new { message = "回答の取得に失敗しました", error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<Answer>> SaveAnswer(Answer answer)
        {
            try
            {
                var existingAnswer = await _context.Answers
                    .FirstOrDefaultAsync(a =>
                        a.ProjectId == answer.ProjectId &&
                        a.BusinessType == answer.BusinessType &&
                        a.QuestionNo == answer.QuestionNo);

                if (existingAnswer != null)
                {
                    existingAnswer.AnswerValue = answer.AnswerValue;
                    existingAnswer.IsCustom = answer.IsCustom;  // カスタムフラグを更新
                    existingAnswer.Memo = answer.Memo;
                    existingAnswer.UpdatedAt = DateTime.Now;

                    _logger.LogInformation($"回答更新: Project={answer.ProjectId}, {answer.BusinessType} {answer.QuestionNo}={answer.AnswerValue}, カスタム={answer.IsCustom}");
                }
                else
                {
                    answer.CreatedAt = DateTime.Now;
                    answer.UpdatedAt = DateTime.Now;
                    _context.Answers.Add(answer);

                    _logger.LogInformation($"回答新規: Project={answer.ProjectId}, {answer.BusinessType} {answer.QuestionNo}={answer.AnswerValue}, カスタム={answer.IsCustom}");
                }

                await _context.SaveChangesAsync();

                // 自動判定を実行（カスタムフラグを渡す）
                await _judgmentService.ExecuteJudgmentAsync(
                    answer.ProjectId,
                    answer.BusinessType,
                    answer.QuestionNo,
                    answer.AnswerValue,
                    answer.IsCustom
                );

                _logger.LogInformation($"回答保存＋判定完了: Project={answer.ProjectId}, {answer.BusinessType} {answer.QuestionNo}={answer.AnswerValue}");

                return Ok(existingAnswer ?? answer);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"回答保存エラー: {answer.BusinessType} {answer.QuestionNo}");
                return StatusCode(500, new { message = "回答の保存に失敗しました", error = ex.Message });
            }
        }

        [HttpPost("bulk")]
        public async Task<ActionResult> SaveAnswersBulk(List<Answer> answers)
        {
            try
            {
                foreach (var answer in answers)
                {
                    var existingAnswer = await _context.Answers
                        .FirstOrDefaultAsync(a =>
                            a.ProjectId == answer.ProjectId &&
                            a.BusinessType == answer.BusinessType &&
                            a.QuestionNo == answer.QuestionNo);

                    if (existingAnswer != null)
                    {
                        existingAnswer.AnswerValue = answer.AnswerValue;
                        existingAnswer.IsCustom = answer.IsCustom;
                        existingAnswer.Memo = answer.Memo;
                        existingAnswer.UpdatedAt = DateTime.Now;
                    }
                    else
                    {
                        answer.CreatedAt = DateTime.Now;
                        answer.UpdatedAt = DateTime.Now;
                        _context.Answers.Add(answer);
                    }
                }

                await _context.SaveChangesAsync();

                // 各回答について判定を実行
                foreach (var answer in answers)
                {
                    await _judgmentService.ExecuteJudgmentAsync(
                        answer.ProjectId,
                        answer.BusinessType,
                        answer.QuestionNo,
                        answer.AnswerValue,
                        answer.IsCustom
                    );
                }

                _logger.LogInformation($"一括保存完了: {answers.Count}件");

                return Ok(new { message = $"{answers.Count}件の回答を保存しました" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "一括保存エラー");
                return StatusCode(500, new { message = "一括保存に失敗しました", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteAnswer(int id)
        {
            try
            {
                var answer = await _context.Answers.FindAsync(id);
                if (answer == null)
                {
                    return NotFound(new { message = "回答が見つかりません" });
                }

                _context.Answers.Remove(answer);
                await _context.SaveChangesAsync();

                // 判定を再実行
                await _judgmentService.ExecuteJudgmentAsync(
                    answer.ProjectId,
                    answer.BusinessType,
                    answer.QuestionNo,
                    "",  // 空文字で削除扱い
                    false
                );

                return Ok(new { message = "回答を削除しました" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"回答削除エラー: ID={id}");
                return StatusCode(500, new { message = "回答の削除に失敗しました", error = ex.Message });
            }
        }
    }
}