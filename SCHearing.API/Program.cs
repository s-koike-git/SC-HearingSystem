using Microsoft.EntityFrameworkCore;
using SCHearing.API.Data;
using SCHearing.API.Services;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Services設定
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// SQLite接続（ローカル開発用）
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// 判定サービス登録
builder.Services.AddScoped<IJudgmentService, JudgmentService>();

// CORS設定（Reactローカル開発用）
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

// DB初期化＋シードデータ投入
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        
        // DBファイル作成
        context.Database.EnsureCreated();
        
        // 初期データ投入（条件シート105件）
        SeedData.Initialize(context);
        
        Console.WriteLine("✓ データベース初期化完了");
        Console.WriteLine($"✓ 条件データ件数: {context.Conditions.Count()}件");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"✗ データベース初期化エラー: {ex.Message}");
    }
}

// Middleware設定
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowLocalDevelopment");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("✓ SCヒアリングシステム API 起動完了");
Console.WriteLine($"  Swagger UI: https://localhost:{builder.Configuration["Kestrel:Endpoints:Https:Url"]?.Split(':').Last() ?? "7000"}/swagger");


var conn = builder.Configuration.GetConnectionString("DefaultConnection");
Console.WriteLine("=== DB ConnectionString ===");
Console.WriteLine(conn);
Console.WriteLine("===========================");


app.Run();
