using Microsoft.EntityFrameworkCore;
using SCHearing.API.Models;

namespace SCHearing.API.Data
{
    /// <summary>
    /// データベースコンテキスト
    /// </summary>
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Project> Projects { get; set; }
        public DbSet<Answer> Answers { get; set; }
        public DbSet<Condition> Conditions { get; set; }
        public DbSet<Judgment> Judgments { get; set; }
        public DbSet<Question> Questions { get; set; }
        public DbSet<ProgramMaster> Programs { get; set; }
        public DbSet<Business> Businesses { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Project設定
            modelBuilder.Entity<Project>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CompanyName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Industry).HasMaxLength(100);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
            });

            // Answer設定
            modelBuilder.Entity<Answer>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BusinessType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.QuestionNo).IsRequired().HasMaxLength(10);
                entity.Property(e => e.AnswerValue).HasMaxLength(50);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");

                entity.HasOne(e => e.Project)
                      .WithMany(p => p.Answers)
                      .HasForeignKey(e => e.ProjectId)
                      .OnDelete(DeleteBehavior.Cascade);

                // インデックス：検索高速化
                entity.HasIndex(e => new { e.ProjectId, e.BusinessType, e.QuestionNo });
            });

            // Condition設定
            modelBuilder.Entity<Condition>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BusinessType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.QuestionNo).IsRequired().HasMaxLength(10);
                entity.Property(e => e.QuestionText).HasMaxLength(500);
                entity.Property(e => e.AnswerCondition).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ProgramId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ProgramName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.IsStandard).HasDefaultValue(true);
                entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");

                // インデックス：検索高速化
                entity.HasIndex(e => new { e.BusinessType, e.QuestionNo });
                entity.HasIndex(e => e.ProgramId);
            });

            // Judgment設定
            modelBuilder.Entity<Judgment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ProgramId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ProgramName).HasMaxLength(200);
                entity.Property(e => e.BusinessType).HasMaxLength(50);
                entity.Property(e => e.IsUsed).HasDefaultValue(true);
                entity.Property(e => e.IsStandard).HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");

                entity.HasOne(e => e.Project)
                      .WithMany(p => p.Judgments)
                      .HasForeignKey(e => e.ProjectId)
                      .OnDelete(DeleteBehavior.Cascade);

                // インデックス：検索高速化
                entity.HasIndex(e => new { e.ProjectId, e.ProgramId }).IsUnique();
            });
        }
    }
}
