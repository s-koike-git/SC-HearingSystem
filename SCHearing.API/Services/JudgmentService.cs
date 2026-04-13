using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Services
{
    public class JudgmentService : IJudgmentService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<JudgmentService> _logger;

        public JudgmentService(AppDbContext context, ILogger<JudgmentService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<bool> ExecuteJudgmentAsync(int projectId, string businessType, string questionNo, string answerValue, bool isCustom = false)
        {
            try
            {
                _logger.LogInformation($"[判定開始] Project={projectId}, {businessType} {questionNo} = '{answerValue}', カスタム={isCustom}");

                await ClearJudgmentsForQuestionAsync(projectId, businessType, questionNo);

                if (string.IsNullOrWhiteSpace(answerValue))
                {
                    _logger.LogInformation($"回答が空欄のため判定スキップ: {businessType} {questionNo}");
                    return true;
                }

                var matchedConditions = await _context.Conditions
                    .Where(c => c.BusinessType == businessType && c.QuestionNo == questionNo)
                    .ToListAsync();

                _logger.LogInformation($"[条件取得] 該当条件数: {matchedConditions.Count}件");

                if (!matchedConditions.Any())
                {
                    _logger.LogWarning($"条件が見つかりません: {businessType} {questionNo}");
                    return true;
                }

                int matchCount = 0;
                foreach (var condition in matchedConditions)
                {
                    _logger.LogInformation($"[条件照合] {condition.ProgramId}: 回答='{answerValue}' vs 条件='{condition.AnswerCondition}'");
                    
                    if (CheckAnswerMatch(answerValue, condition.AnswerCondition))
                    {
                        _logger.LogInformation($"[マッチ成功] {condition.ProgramId} - {condition.ProgramName}");
                        
                        // カスタムフラグを渡して判定結果を保存
                        await SaveJudgmentAsync(projectId, condition, isCustom);
                        matchCount++;
                    }
                    else
                    {
                        _logger.LogInformation($"[マッチ失敗] {condition.ProgramId}");
                    }
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation($"判定完了: {businessType} {questionNo} = {answerValue}, マッチ数={matchCount}");

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"判定エラー: {businessType} {questionNo}");
                return false;
            }
        }

        private async Task ClearJudgmentsForQuestionAsync(int projectId, string businessType, string questionNo)
        {
            var programIds = await _context.Conditions
                .Where(c => c.BusinessType == businessType && c.QuestionNo == questionNo)
                .Select(c => c.ProgramId)
                .Distinct()
                .ToListAsync();

            foreach (var programId in programIds)
            {
                var isUsedByOtherQuestions = await IsProgramUsedByOtherQuestionsAsync(
                    projectId, businessType, questionNo, programId);

                if (!isUsedByOtherQuestions)
                {
                    var judgment = await _context.Judgments
                        .FirstOrDefaultAsync(j => j.ProjectId == projectId && j.ProgramId == programId);

                    if (judgment != null)
                    {
                        _context.Judgments.Remove(judgment);
                    }
                }
            }
        }

        private async Task<bool> IsProgramUsedByOtherQuestionsAsync(
            int projectId, string businessType, string currentQuestionNo, string programId)
        {
            var allAnswers = await _context.Answers
                .Where(a => a.ProjectId == projectId)
                .ToListAsync();

            var allConditionsForProgram = await _context.Conditions
                .Where(c => c.ProgramId == programId)
                .ToListAsync();

            foreach (var answer in allAnswers)
            {
                if (answer.BusinessType == businessType && answer.QuestionNo == currentQuestionNo)
                    continue;

                if (string.IsNullOrWhiteSpace(answer.AnswerValue))
                    continue;

                var matchedConditions = allConditionsForProgram
                    .Where(c => c.BusinessType == answer.BusinessType && c.QuestionNo == answer.QuestionNo)
                    .Where(c => CheckAnswerMatch(answer.AnswerValue, c.AnswerCondition));

                if (matchedConditions.Any())
                {
                    return true;
                }
            }

            return false;
        }

        private bool CheckAnswerMatch(string answerValue, string condition)
        {
            answerValue = answerValue.Trim();
            condition = condition.ToLower().Trim();

            _logger.LogInformation($"[詳細照合] 回答='{answerValue}'({answerValue.Length}文字), 条件='{condition}'");

            if (condition.Contains("○の場合") || condition.Contains("はいの場合"))
            {
                bool match = answerValue == "○" || answerValue == "はい" || answerValue.ToLower() == "yes";
                _logger.LogInformation($"[○判定] 結果={match}");
                return match;
            }

            if (condition.Contains("×") && condition.Contains("制限"))
            {
                bool match = answerValue == "×" || answerValue == "いいえ" || answerValue.ToLower() == "no";
                _logger.LogInformation($"[×判定] 結果={match}");
                return match;
            }

            if (condition.Contains("1の場合") || condition.Contains("1:") || condition.Contains("1."))
            {
                bool match = answerValue == "1";
                _logger.LogInformation($"[1判定] 結果={match}");
                return match;
            }

            if (condition.Contains("2の場合") || condition.Contains("2:") || condition.Contains("2."))
            {
                bool match = answerValue == "2";
                _logger.LogInformation($"[2判定] 結果={match}");
                return match;
            }

            if (condition.Contains("3の場合") || condition.Contains("3:") || condition.Contains("3."))
            {
                bool match = answerValue == "3";
                _logger.LogInformation($"[3判定] 結果={match}");
                return match;
            }

            if (condition.Contains("4の場合") || condition.Contains("4:") || condition.Contains("4."))
            {
                bool match = answerValue == "4";
                _logger.LogInformation($"[4判定] 結果={match}");
                return match;
            }

            if (condition.Contains("全回答") || condition.Contains("全ての場合"))
            {
                bool match = !string.IsNullOrWhiteSpace(answerValue);
                _logger.LogInformation($"[全回答判定] 結果={match}");
                return match;
            }

            _logger.LogInformation($"[判定失敗] マッチ条件なし");
            return false;
        }

        private async Task SaveJudgmentAsync(int projectId, Condition condition, bool isCustom)
        {
            var existingJudgment = await _context.Judgments
                .FirstOrDefaultAsync(j => j.ProjectId == projectId && j.ProgramId == condition.ProgramId);

            if (existingJudgment != null)
            {
                existingJudgment.IsUsed = true;
                // カスタムフラグを更新（既にtrueならそのまま、falseなら引数の値を設定）
                existingJudgment.IsCustom = existingJudgment.IsCustom || isCustom;
                existingJudgment.UpdatedAt = DateTime.Now;
                _logger.LogInformation($"[判定更新] {condition.ProgramId}, カスタム={existingJudgment.IsCustom}");
            }
            else
            {
                var judgment = new Judgment
                {
                    ProjectId = projectId,
                    ProgramId = condition.ProgramId,
                    ProgramName = condition.ProgramName,
                    BusinessType = condition.BusinessType,
                    IsUsed = true,
                    IsStandard = condition.IsStandard,
                    IsCustom = isCustom,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };

                _context.Judgments.Add(judgment);
                _logger.LogInformation($"[判定追加] {condition.ProgramId} - {condition.ProgramName}, カスタム={isCustom}");
            }
        }

        public async Task<bool> ReExecuteAllJudgmentsAsync(int projectId)
        {
            try
            {
                var existingJudgments = await _context.Judgments
                    .Where(j => j.ProjectId == projectId)
                    .ToListAsync();

                _context.Judgments.RemoveRange(existingJudgments);
                await _context.SaveChangesAsync();

                var allAnswers = await _context.Answers
                    .Where(a => a.ProjectId == projectId)
                    .ToListAsync();

                foreach (var answer in allAnswers)
                {
                    await ExecuteJudgmentAsync(
                        projectId,
                        answer.BusinessType,
                        answer.QuestionNo,
                        answer.AnswerValue,
                        answer.IsCustom  // カスタムフラグを渡す
                    );
                }

                _logger.LogInformation($"全判定再実行完了: ProjectId={projectId}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"全判定再実行エラー: ProjectId={projectId}");
                return false;
            }
        }
    }
}