using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SCHearing.API.Migrations
{
    /// <inheritdoc />
    public partial class FixQuestionColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.AddColumn<string>(
                name: "Implementation",
                table: "Questions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "Questions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Settings",
                table: "Questions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Implementation",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "Settings",
                table: "Questions");

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
    }
}
