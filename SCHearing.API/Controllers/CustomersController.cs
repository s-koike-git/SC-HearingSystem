// =====================================================
// Controllers/CustomersController.cs
// =====================================================
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CustomersController(AppDbContext context)
        {
            _context = context;
        }

        // ─── 一覧取得 ────────────────────────────────────────────
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Customer>>> GetAll()
        {
            return await _context.Customers
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        // ─── 1件取得 ─────────────────────────────────────────────
        [HttpGet("{id}")]
        public async Task<ActionResult<Customer>> GetById(int id)
        {
            var item = await _context.Customers.FindAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        // ─── 新規登録 ─────────────────────────────────────────────
        [HttpPost]
        public async Task<ActionResult<Customer>> Create([FromBody] CustomerDto dto)
        {
            var customer = new Customer
            {
                Name            = dto.Name,
                Industry        = dto.Industry,
                PrimeType       = dto.PrimeType,
                Partner         = dto.Partner,
                Modules         = dto.Modules,
                Version         = dto.Version,
                ProposalStatus  = dto.ProposalStatus,
                ScMaintDate     = dto.ScMaintDate,
                ServerEnv       = dto.ServerEnv,
                ServerMaintDate = dto.ServerMaintDate,
                Contact         = dto.Contact,
                CustomerContact = dto.CustomerContact,
                Notes           = dto.Notes,
                MonthlyFee      = dto.MonthlyFee,
                CreatedAt       = DateTime.Now,
                UpdatedAt       = DateTime.Now,
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = customer.Id }, customer);
        }

        // ─── 更新 ─────────────────────────────────────────────────
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CustomerDto dto)
        {
            var item = await _context.Customers.FindAsync(id);
            if (item == null) return NotFound();

            item.Name            = dto.Name;
            item.Industry        = dto.Industry;
            item.PrimeType       = dto.PrimeType;
            item.Partner         = dto.Partner;
            item.Modules         = dto.Modules;
            item.Version         = dto.Version;
            item.ProposalStatus  = dto.ProposalStatus;
            item.ScMaintDate     = dto.ScMaintDate;
            item.ServerEnv       = dto.ServerEnv;
            item.ServerMaintDate = dto.ServerMaintDate;
            item.Contact         = dto.Contact;
            item.CustomerContact = dto.CustomerContact;
            item.Notes           = dto.Notes;
            item.MonthlyFee      = dto.MonthlyFee;
            item.UpdatedAt       = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(item);
        }

        // ─── 削除 ────────────────────────────────────────────────
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.Customers.FindAsync(id);
            if (item == null) return NotFound();

            _context.Customers.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    // ─── DTO ─────────────────────────────────────────────────────
    public class CustomerDto
    {
        public string Name            { get; set; } = string.Empty;
        public string Industry        { get; set; } = string.Empty;
        public string PrimeType       { get; set; } = "プライム";
        public string? Partner        { get; set; }
        public string Modules         { get; set; } = "SC販売";
        public double? Version        { get; set; }
        public string ProposalStatus  { get; set; } = "未提案";
        public string? ScMaintDate    { get; set; }
        public string? ServerEnv      { get; set; }
        public string? ServerMaintDate { get; set; }
        public string Contact         { get; set; } = string.Empty;
        public string? CustomerContact { get; set; }
        public string? Notes          { get; set; }
        public int? MonthlyFee        { get; set; }
    }
}
