namespace SCHearing.API.Services
{
    /// <summary>
    /// 自動判定サービスのインターフェース
    /// </summary>
    public interface IJudgmentService
    {
        /// <summary>
        /// 回答に基づいて自動判定を実行
        /// </summary>
        Task<bool> ExecuteJudgmentAsync(int projectId, string businessType, string questionNo, string answerValue, bool isCustom = false);

        /// <summary>
        /// 案件全体の判定を再実行
        /// </summary>
        Task<bool> ReExecuteAllJudgmentsAsync(int projectId);
    }
}