namespace TmsApi.Application.DTOs;

public class UpdateCourseDto
{
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int MaxCapacity { get; set; }
}