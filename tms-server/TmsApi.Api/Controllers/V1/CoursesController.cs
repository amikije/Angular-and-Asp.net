using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TmsApi.Application.DTOs;
using TmsApi.Domain.Entities;
using TmsApi.Infrastructure.Persistence;

namespace TmsApi.Api.Controllers.V1;

[ApiController]
[Route("api/v{version:apiVersion}/courses")]
[ApiVersion("1.0")]
[Authorize(Roles = "Instructor,Admin")]
public class CoursesController : ControllerBase
{
    private readonly TmsDbContext _context;
    private readonly IAuthorizationService _authorizationService;

    public CoursesController(
        TmsDbContext context,
        IAuthorizationService authorizationService)
    {
        _context = context;
        _authorizationService = authorizationService;
    }

    [HttpGet]
    [AllowAnonymous]
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
                c.InstructorId,
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

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCourse(int id, [FromBody] UpdateCourseDto dto)
    {
        var course = await _context.Courses.FindAsync(id);
        if (course == null)
        {
            return NotFound();
        }

        var authResult = await _authorizationService
            .AuthorizeAsync(User, course, "CanEditCourse");

        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        course.Code = dto.Code;
        course.Title = dto.Title;
        course.MaxCapacity = dto.MaxCapacity;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCourse(int id, CancellationToken ct)
    {
        var course = await _context.Courses
            .Include(c => c.Enrollments)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (course == null)
        {
            return NotFound();
        }

        var authResult = await _authorizationService
            .AuthorizeAsync(User, course, "CanEditCourse");

        if (!authResult.Succeeded)
        {
            return Forbid();
        }


        var hasActiveEnrollments = course.Enrollments.Any();


        if (hasActiveEnrollments)
        {
            return Conflict(new
            {
                title = "Conflict",
                detail = "Cannot delete course: active student enrollments exist.",
                status = 409
            });
        }

        _context.Courses.Remove(course);
        await _context.SaveChangesAsync(ct);

        return NoContent();
    }
}