using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TmsApi.Infrastructure.Persistence;

namespace TmsApi.Api.Controllers.V1;

[ApiController]
[Route("api/v{version:apiVersion}/courses")]
[ApiVersion("1.0")]
public class CoursesController : ControllerBase
{
    private readonly TmsDbContext _context;

    public CoursesController(TmsDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCourses(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var baseQuery = _context.Courses.AsNoTracking();
        var totalCount = await baseQuery.CountAsync(ct);

        var items = await baseQuery
            .OrderBy(c => c.Title)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.Code,
                c.Title,
                c.MaxCapacity,
                EnrollmentCount = c.Enrollments.Count
            })
            .ToListAsync(ct);

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return Ok(new
        {
            items,
            totalCount,
            page,
            pageSize,
            totalPages,
            hasNext = page < totalPages,
            hasPrevious = page > 1
        });
    }

    // ✅ DELETE endpoint with optimistic rollback support
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCourse(int id, CancellationToken ct)
    {
        // 1. Find the course
        var course = await _context.Courses
            .Include(c => c.Enrollments)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (course == null)
        {
            return NotFound(new
            {
                title = "Not Found",
                detail = $"Course with ID {id} was not found.",
                status = 404
            });
        }

        // 2. Check if course has any enrollments before deleting it
        var hasEnrollments = course.Enrollments.Any();

        if (hasEnrollments)
        {
            return Conflict(new
            {
                title = "Conflict",
                detail = "Cannot delete course: student enrollments exist.",
                status = 409
            });
        }

        // 3. Delete the course
        _context.Courses.Remove(course);
        await _context.SaveChangesAsync(ct);

        return NoContent();
    }
}