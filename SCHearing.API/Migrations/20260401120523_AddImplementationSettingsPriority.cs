using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SCHearing.API.Migrations
{
    /// <inheritdoc />
    public partial class AddImplementationSettingsPriority : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Type",
                table: "Questions",
                newName: "QuestionText");

            migrationBuilder.RenameColumn(
                name: "Text",
                table: "Questions",
                newName: "AnswerType");

            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                table: "Questions",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                table: "Questions");

            migrationBuilder.RenameColumn(
                name: "QuestionText",
                table: "Questions",
                newName: "Type");

            migrationBuilder.RenameColumn(
                name: "AnswerType",
                table: "Questions",
                newName: "Text");
        }
    }
}
