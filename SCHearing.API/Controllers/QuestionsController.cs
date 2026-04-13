using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;
using SCHearing.API.Dtos;
using System.Text.Json;


namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public QuestionsController(AppDbContext context)
        {
            _context = context;
        }

        // ============================================
        // 質問マスタ画面用：全件取得
        // ============================================
        [HttpGet("all")]
        public async Task<ActionResult<IEnumerable<Question>>> GetAllQuestions()
        {
            return await _context.Questions
                .ToListAsync();

        }

        // ============================================
        // ヒアリング用：業務別取得
        // ============================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Question>>> GetQuestions(
            [FromQuery] string businessType)
        {
            if (string.IsNullOrWhiteSpace(businessType))
            {
                return BadRequest("businessType は必須です。");
            }

            return await _context.Questions
                .Where(q => q.BusinessType == businessType)
                .ToListAsync();

        }

        // ============================================
        // 質問追加
        // ============================================
        [HttpPost]
        public async Task<ActionResult<Question>> CreateQuestion(Question question)
        {
            _context.Questions.Add(question);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAllQuestions), new { id = question.Id }, question);
        }

        // ============================================
        // 質問更新
        // ============================================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateQuestion(int id, Question question)
        {
            if (id != question.Id)
            {
                return BadRequest();
            }

            _context.Entry(question).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ============================================
        // 質問削除
        // ============================================
        
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteQuestion(int id)
        {
            var question = await _context.Questions.FindAsync(id);
            if (question == null)
            {
                return NotFound();
            }

            _context.Questions.Remove(question);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        
        /// <summary>
        /// 質問一括登録（CSVインポート用）
        /// </summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> SaveBulkQuestions(
            [FromBody] List<QuestionImportDto> items)
        {
            Console.WriteLine($"Bulk import received: {items.Count}");

            // マスタ前提なので全削除
            _context.Questions.RemoveRange(_context.Questions);
            await _context.SaveChangesAsync();

            var entities = items.Select(item => new Question
            {
                BusinessType = item.BusinessType,
                QuestionNo = item.QuestionNo,

                // CSV → DB 正式列
                QuestionText = item.Text,
                AnswerType = item.Type,

                OptionsJson = JsonSerializer.Serialize(new
                {
                    choice = item.ChoicePrograms,
                    yes = item.YesPrograms,
                    no = item.NoPrograms
                }),

                // ✅ 今回追加した列
                Implementation = item.Implementation,
                Settings = item.Settings,
                Priority = item.Priority,

                DisplayOrder = 0
            }).ToList();

            _context.Questions.AddRange(entities);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}