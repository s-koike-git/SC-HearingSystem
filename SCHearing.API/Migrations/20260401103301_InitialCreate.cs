using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SCHearing.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Businesses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Businesses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Conditions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BusinessType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    QuestionNo = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    QuestionText = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    AnswerCondition = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    ProgramId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    ProgramName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    IsStandard = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    Remarks = table.Column<string>(type: "TEXT", nullable: false),
                    DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')"),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Conditions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Programs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProgramId = table.Column<string>(type: "TEXT", nullable: false),
                    ProgramName = table.Column<string>(type: "TEXT", nullable: false),
                    WorkHours = table.Column<double>(type: "REAL", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Programs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CompanyName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Industry = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    ContactPerson = table.Column<string>(type: "TEXT", nullable: false),
                    PhoneNumber = table.Column<string>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    Remarks = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')"),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Questions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BusinessType = table.Column<string>(type: "TEXT", nullable: false),
                    QuestionNo = table.Column<string>(type: "TEXT", nullable: false),
                    QuestionText = table.Column<string>(type: "TEXT", nullable: false),
                    AnswerType = table.Column<string>(type: "TEXT", nullable: false),
                    OptionsJson = table.Column<string>(type: "TEXT", nullable: true),
                    DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Questions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Answers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: false),
                    BusinessType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    QuestionNo = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    AnswerValue = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    IsCustom = table.Column<bool>(type: "INTEGER", nullable: false),
                    Memo = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')"),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Answers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Answers_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Judgments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: false),
                    ProgramId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    ProgramName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    BusinessType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    IsUsed = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    IsStandard = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    IsCustom = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')"),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Judgments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Judgments_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Answers_ProjectId_BusinessType_QuestionNo",
                table: "Answers",
                columns: new[] { "ProjectId", "BusinessType", "QuestionNo" });

            migrationBuilder.CreateIndex(
                name: "IX_Conditions_BusinessType_QuestionNo",
                table: "Conditions",
                columns: new[] { "BusinessType", "QuestionNo" });

            migrationBuilder.CreateIndex(
                name: "IX_Conditions_ProgramId",
                table: "Conditions",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_Judgments_ProjectId_ProgramId",
                table: "Judgments",
                columns: new[] { "ProjectId", "ProgramId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Answers");

            migrationBuilder.DropTable(
                name: "Businesses");

            migrationBuilder.DropTable(
                name: "Conditions");

            migrationBuilder.DropTable(
                name: "Judgments");

            migrationBuilder.DropTable(
                name: "Programs");

            migrationBuilder.DropTable(
                name: "Questions");

            migrationBuilder.DropTable(
                name: "Projects");
        }
    }
}
