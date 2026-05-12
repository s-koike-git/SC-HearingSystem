using Microsoft.EntityFrameworkCore;
using SCHearing.API.Models;

namespace SCHearing.API.Data
{
    /// <summary>
    /// データベースコンテキスト (F5: 4階層フロー対応版)
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
        public DbSet<User> Users { get; set; }
        public DbSet<Announcement> Announcements { get; set; }
        public DbSet<ProgramEstimate> ProgramEstimates { get; set; }
        public DbSet<ProgramEstimateItem> ProgramEstimateItems { get; set; }
        public DbSet<BusinessFlowMapping> BusinessFlowMappings { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<CustomerProject> CustomerProjects { get; set; }
        public DbSet<CustomerFile> CustomerFiles { get; set; }
        public DbSet<WorkTask> WorkTasks { get; set; }

        // 第1階層
        public DbSet<BusinessProcessFlowStep> BusinessProcessFlowSteps { get; set; } = null!;
        public DbSet<BusinessProcessFlowConnection> BusinessProcessFlowConnections { get; set; } = null!;

        // 第2階層: 業務フロー (業務処理単位)
        public DbSet<BusinessFlowStep> BusinessFlowSteps { get; set; }

        // 第3階層: 機能フロー (NEW: F5)
        public DbSet<FunctionalFlowStep> FunctionalFlowSteps { get; set; } = null!;

        // 第4階層
        public DbSet<SystemFlowStep> SystemFlowSteps { get; set; }
        public DbSet<SystemFlowNode> SystemFlowNodes { get; set; }

        public DbSet<FlowQuestionMapping> FlowQuestionMappings { get; set; }
        public DbSet<FlowProgramMapping> FlowProgramMappings { get; set; }
        public DbSet<FlowConnection> FlowConnections { get; set; }
        public DbSet<Inquiry> Inquiries { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Project>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CompanyName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Industry).HasMaxLength(100);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
            });

            modelBuilder.Entity<Answer>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BusinessType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.QuestionNo).IsRequired().HasMaxLength(10);
                entity.Property(e => e.AnswerValue).HasMaxLength(50);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasOne(e => e.Project).WithMany(p => p.Answers).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => new { e.ProjectId, e.BusinessType, e.QuestionNo });
            });

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
                entity.HasIndex(e => new { e.BusinessType, e.QuestionNo });
                entity.HasIndex(e => e.ProgramId);
            });

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
                entity.HasOne(e => e.Project).WithMany(p => p.Judgments).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => new { e.ProjectId, e.ProgramId }).IsUnique();
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Password).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Email).HasMaxLength(100);
                entity.Property(e => e.Role).IsRequired().HasMaxLength(20).HasDefaultValue("user");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasIndex(e => e.Username).IsUnique();
            });

            modelBuilder.Entity<Announcement>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Content).IsRequired();
                entity.Property(e => e.Priority).HasMaxLength(10).HasDefaultValue("通常");
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.HasIndex(e => e.PublishedAt);
                entity.HasIndex(e => e.IsActive);
            });

            modelBuilder.Entity<ProgramEstimate>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(1000);
                entity.Property(e => e.TotalHours).HasColumnType("decimal(10,2)");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.UserId);
            });

            modelBuilder.Entity<ProgramEstimateItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ProgramId).HasMaxLength(50);
                entity.Property(e => e.ProgramName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.DesignWorkHours).HasColumnType("decimal(10,2)");
                entity.Property(e => e.BaseWorkHours).HasColumnType("decimal(10,2)");
                entity.Property(e => e.Factor).HasColumnType("decimal(5,2)").HasDefaultValue(1.0m);
                entity.Property(e => e.IsCustomProgram).HasDefaultValue(false);
                entity.HasOne(e => e.Estimate).WithMany(pe => pe.Items).HasForeignKey(e => e.EstimateId).OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.EstimateId);
            });

            modelBuilder.Entity<BusinessFlowMapping>(entity =>
            {
                entity.ToTable("BusinessFlowMapping");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BusinessType).IsRequired();
                entity.Property(e => e.StepId).IsRequired();
                entity.Property(e => e.NodeId).IsRequired();
                entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
                entity.Property(e => e.IsActive).HasDefaultValue(1);
            });

            // 第1階層: BusinessProcessFlowSteps
            modelBuilder.Entity<BusinessProcessFlowStep>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.StepId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.StepName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
                entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
                entity.Property(e => e.Description).HasMaxLength(1000);
                entity.Property(e => e.MermaidStyle).HasMaxLength(50);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasIndex(e => e.StepId).IsUnique();
                entity.HasIndex(e => e.Category);
                entity.HasIndex(e => e.DisplayOrder);
            });

            modelBuilder.Entity<BusinessProcessFlowConnection>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FromStepId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ToStepId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ConnectionType).IsRequired().HasMaxLength(50).HasDefaultValue("normal");
                entity.Property(e => e.ConditionLabel).HasMaxLength(200);
                entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasIndex(e => e.FromStepId);
                entity.HasIndex(e => e.ToStepId);
                entity.HasIndex(e => e.DisplayOrder);
            });

            // 第2階層: BusinessFlowSteps (業務処理単位、F5で再定義)
            modelBuilder.Entity<BusinessFlowStep>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.StepId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.StepName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.NodeId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.NodeLabel).IsRequired().HasMaxLength(200);
                entity.Property(e => e.NodeType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
                entity.Property(e => e.ParentNodeId).HasMaxLength(50);
                entity.Property(e => e.ConnectionType).HasMaxLength(50).HasDefaultValue("normal");
                entity.Property(e => e.MermaidStyle).HasMaxLength(50);
                entity.Property(e => e.BusinessProcessStepId).HasMaxLength(100);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasIndex(e => new { e.StepId, e.NodeId }).IsUnique();
                entity.HasIndex(e => e.DisplayOrder);
                entity.HasIndex(e => e.BusinessProcessStepId);
            });

            // 第3階層: FunctionalFlowSteps (NEW)
            modelBuilder.Entity<FunctionalFlowStep>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.StepId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.StepName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.NodeId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.NodeLabel).IsRequired().HasMaxLength(200);
                entity.Property(e => e.NodeType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
                entity.Property(e => e.ParentNodeId).HasMaxLength(50);
                entity.Property(e => e.ConnectionType).HasMaxLength(50).HasDefaultValue("normal");
                entity.Property(e => e.MermaidStyle).HasMaxLength(50);
                entity.Property(e => e.BusinessFlowStepId).HasMaxLength(100);
                entity.Property(e => e.BusinessProcessStepId).HasMaxLength(100);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasIndex(e => new { e.StepId, e.NodeId }).IsUnique();
                entity.HasIndex(e => e.DisplayOrder);
                entity.HasIndex(e => e.BusinessFlowStepId);
                entity.HasIndex(e => e.BusinessProcessStepId);
            });

            // 第4階層: SystemFlowSteps
            modelBuilder.Entity<SystemFlowStep>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.StepId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.StepName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.BusinessType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.BusinessFlowStepId).HasMaxLength(50);
                entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
                entity.Property(e => e.IsSubgraph).HasDefaultValue(false);
                entity.Property(e => e.SubgraphLabel).HasMaxLength(100);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasIndex(e => e.StepId).IsUnique();
                entity.HasIndex(e => e.BusinessType);
                entity.HasIndex(e => e.BusinessFlowStepId);
                entity.HasIndex(e => e.DisplayOrder);
            });

            modelBuilder.Entity<SystemFlowNode>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.NodeId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.FlowStepId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.NodeLabel).IsRequired().HasMaxLength(200);
                entity.Property(e => e.NodeType).IsRequired().HasMaxLength(20);
                entity.Property(e => e.SourceType).IsRequired().HasMaxLength(30);
                entity.Property(e => e.SourceRef).HasMaxLength(200);
                entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
                entity.Property(e => e.MermaidStyle).HasMaxLength(50);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasIndex(e => e.NodeId).IsUnique();
                entity.HasIndex(e => e.FlowStepId);
                entity.HasIndex(e => e.SourceType);
                entity.HasIndex(e => e.SourceRef);
            });

            modelBuilder.Entity<FlowQuestionMapping>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BusinessType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.QuestionNo).IsRequired().HasMaxLength(10);
                entity.Property(e => e.AnswerCondition).IsRequired().HasMaxLength(100);
                entity.Property(e => e.FlowStepId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.FlowType).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Priority).HasDefaultValue(0);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasIndex(e => new { e.BusinessType, e.QuestionNo });
                entity.HasIndex(e => e.FlowStepId);
            });

            modelBuilder.Entity<FlowProgramMapping>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FlowStepId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ProgramId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
                entity.Property(e => e.IsRequired).HasDefaultValue(true);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasIndex(e => e.FlowStepId);
                entity.HasIndex(e => e.ProgramId);
            });

            modelBuilder.Entity<FlowConnection>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FromNodeId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ToNodeId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ConnectionType).IsRequired().HasMaxLength(50).HasDefaultValue("normal");
                entity.Property(e => e.ConditionLabel).HasMaxLength(100);
                entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
                entity.Property(e => e.FlowType).IsRequired().HasMaxLength(20).HasDefaultValue("business");
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
                entity.HasIndex(e => e.FromNodeId);
                entity.HasIndex(e => e.ToNodeId);
                entity.HasIndex(e => e.FlowType);
                entity.HasIndex(e => e.DisplayOrder);
            });
        }
    }
}
