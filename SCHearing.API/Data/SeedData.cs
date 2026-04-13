using Microsoft.EntityFrameworkCore;
using SCHearing.API.Models;
using System.Text.Json;

namespace SCHearing.API.Data
{
    /// <summary>
    /// 初期データ投入（条件・質問データ）
    /// </summary>
    public static class SeedData
    {
        /// <summary>
        /// データベースを初期化
        /// </summary>
        public static void Initialize(AppDbContext context)
        {
            try
            {
                // ==========================
                // 条件データ投入（Conditions）
                // ==========================
                if (!context.Conditions.Any())
                {
                    var conditionsPath = Path.Combine(
                        AppDomain.CurrentDomain.BaseDirectory,
                        "..", "..", "..", "..",
                        "data-migration",
                        "conditions-data.json"
                    );

                    if (!File.Exists(conditionsPath))
                    {
                        Console.WriteLine($"  ⚠ 条件データファイルが見つかりません: {conditionsPath}");
                        InitializeWithSampleData(context);
                    }
                    else
                    {
                        var json = File.ReadAllText(conditionsPath);
                        var conditionsData = JsonSerializer.Deserialize<List<ConditionData>>(json);

                        if (conditionsData != null && conditionsData.Any())
                        {
                            foreach (var data in conditionsData)
                            {
                                var condition = new Condition
                                {
                                    BusinessType = data.BusinessType,
                                    QuestionNo = data.QuestionNo,
                                    QuestionText = data.QuestionText,
                                    AnswerCondition = data.AnswerCondition,
                                    ProgramId = data.ProgramId,
                                    ProgramName = data.ProgramName,
                                    IsStandard = data.IsStandard,
                                    Remarks = data.Remarks ?? string.Empty,
                                    DisplayOrder = data.DisplayOrder,
                                    CreatedAt = DateTime.Now,
                                    UpdatedAt = DateTime.Now
                                };

                                context.Conditions.Add(condition);
                            }

                            context.SaveChanges();
                            Console.WriteLine($"  ✓ 条件データ投入完了: {conditionsData.Count}件");
                        }
                    }
                }
                else
                {
                    Console.WriteLine($"  条件データは既に存在します（{context.Conditions.Count()}件）");
                }

                // ==========================
                // 質問データ投入（Questions）
                // ==========================
                if (!context.Questions.Any())
                {
                    var questionsPath = Path.Combine(
                        AppDomain.CurrentDomain.BaseDirectory,
                        "..", "..", "..", "..",
                        "data-migration",
                        "questions-estimate.json"
                    );

                    if (!File.Exists(questionsPath))
                    {
                        Console.WriteLine($"  ⚠ 質問データファイルが見つかりません: {questionsPath}");
                    }
                    else
                    {
                        var json = File.ReadAllText(questionsPath);
                        var questions = JsonSerializer.Deserialize<List<Question>>(json);

                        if (questions != null && questions.Any())
                        {
                            context.Questions.AddRange(questions);
                            context.SaveChanges();
                            Console.WriteLine($"  ✓ 質問データ投入完了: {questions.Count}件");
                        }
                    }
                }
                else
                {
                    Console.WriteLine($"  質問データは既に存在します（{context.Questions.Count()}件）");
                }

                Console.WriteLine("✓ データベース初期化完了");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  ✗ 初期データ投入エラー: {ex.Message}");
            }
        }

        /// <summary>
        /// サンプル条件データ
        /// </summary>
        private static void InitializeWithSampleData(AppDbContext context)
        {
            var sampleConditions = new List<Condition>
            {
                new Condition
                {
                    BusinessType = "見積",
                    QuestionNo = "Q1",
                    QuestionText = "見積パターンを使用するか",
                    AnswerCondition = "○の場合",
                    ProgramId = "ESTMR01",
                    ProgramName = "見積パターン登録",
                    IsStandard = true,
                    Remarks = "",
                    DisplayOrder = 1,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                }
            };

            context.Conditions.AddRange(sampleConditions);
            context.SaveChanges();
            Console.WriteLine($"  ✓ サンプル条件データ投入完了: {sampleConditions.Count}件");
        }

        /// <summary>
        /// conditions-data.json 用データモデル
        /// </summary>
        private class ConditionData
        {
            public string BusinessType { get; set; } = string.Empty;
            public string QuestionNo { get; set; } = string.Empty;
            public string QuestionText { get; set; } = string.Empty;
            public string AnswerCondition { get; set; } = string.Empty;
            public string ProgramId { get; set; } = string.Empty;
            public string ProgramName { get; set; } = string.Empty;
            public bool IsStandard { get; set; } = true;
            public string? Remarks { get; set; }
            public int DisplayOrder { get; set; }
        }
    }
}