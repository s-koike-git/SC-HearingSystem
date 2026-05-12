using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Models;

namespace SCHearing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        public AuthController(AppDbContext context) { _context = context; }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username && u.Password == request.Password);
            if (user == null)
                return Unauthorized(new { message = "ユーザー名またはパスワードが正しくありません" });

            var roles = SplitRoles(user.Role);
            return Ok(new { id = user.Id, username = user.Username, email = user.Email,
                fullName = user.FullName, role = user.Role, roles });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            // ★ ToListAsync() で先にエンティティを取得し、その後 C# 側で変換する
            var list = await _context.Users.OrderBy(u => u.Username).ToListAsync();
            return Ok(list.Select(u => new
            {
                id = u.Id, username = u.Username, email = u.Email,
                fullName = u.FullName, role = u.Role,
                roles = SplitRoles(u.Role), password = u.Password,
            }));
        }

        [HttpGet("customer-managers")]
        public async Task<IActionResult> GetCustomerManagers()
        {
            // ★ 同様に先に全取得、C#側でフィルタ
            var list = await _context.Users.ToListAsync();
            var managers = list
                .Where(u => u.Role.Contains("customer_manager") || u.Role.Contains("admin"))
                .OrderBy(u => string.IsNullOrEmpty(u.FullName) ? u.Username : u.FullName)
                .Select(u => new
                {
                    id = u.Id, username = u.Username,
                    fullName = string.IsNullOrEmpty(u.FullName) ? u.Username : u.FullName,
                });
            return Ok(managers);
        }

        [HttpPost("users")]
        public async Task<IActionResult> CreateUser([FromBody] UserRequest req)
        {
            var user = new User
            {
                Username = req.Username, Password = req.Password,
                Email = req.Email ?? string.Empty,
                FullName = req.FullName ?? req.Username,
                Role = NormalizeRoles(req.Roles ?? new[] { "user" }),
                CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now,
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return Ok(new { id = user.Id, username = user.Username, email = user.Email,
                fullName = user.FullName, role = user.Role, roles = SplitRoles(user.Role) });
        }

        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UserRequest req)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            user.Username = req.Username; user.Password = req.Password;
            user.Email = req.Email ?? string.Empty;
            user.FullName = req.FullName ?? req.Username;
            user.Role = NormalizeRoles(req.Roles ?? new[] { "user" });
            user.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new { id = user.Id, username = user.Username, email = user.Email,
                fullName = user.FullName, role = user.Role, roles = SplitRoles(user.Role) });
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static string[] SplitRoles(string role) =>
            role.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(r => r.Trim()).ToArray();

        private static string NormalizeRoles(string[] roles)
        {
            var valid = new HashSet<string> { "admin", "user", "customer_manager" };
            var filtered = roles.Where(r => valid.Contains(r.Trim())).Distinct().ToList();
            if (!filtered.Any()) filtered.Add("user");
            return string.Join(",", filtered);
        }
    }

    public class LoginRequest { public string Username { get; set; } = ""; public string Password { get; set; } = ""; }
    public class UserRequest { public string Username { get; set; } = ""; public string Password { get; set; } = ""; public string? Email { get; set; } public string? FullName { get; set; } public string[]? Roles { get; set; } }
}
