using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SCHearing.API.Data;
using SCHearing.API.Services;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// =========================
// Services設定
// =========================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// =========================
// SQLite接続
// =========================
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

// =========================
// 判定サービス
// =========================
builder.Services.AddScoped<IJudgmentService, JudgmentService>();

// =========================
// 🔴 認証設定（ここが重要）
// =========================
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = false,

            // ★ User.Identity.Name に入る Claim を指定
            NameClaimType = ClaimTypes.Name
        };
    });

// =========================
// CORS設定
// =========================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalDevelopment", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// =========================
// DB初期化 + PRAGMA設定
// =========================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();

        context.Database.EnsureCreated();
        context.Database.ExecuteSqlRaw("PRAGMA journal_mode=DELETE;");
        SeedData.Initialize(context);

        Console.WriteLine("✓ データベース初期化完了");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"✗ データベース初期化エラー: {ex.Message}");
    }
}

// =========================
// Middleware設定（順序重要）
// =========================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowLocalDevelopment");

app.UseHttpsRedirection();

// 🔴 認証 → 認可 の順番厳守
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

Console.WriteLine("✓ SCヒアリングシステム API 起動完了");
app.Run();