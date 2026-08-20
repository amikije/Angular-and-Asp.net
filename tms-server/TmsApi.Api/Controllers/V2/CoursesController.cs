using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using TmsApi.Application.Dtos;
using TmsApi.Application.DTOs;
using TmsApi.Application.Interfaces;
using TmsApi.Application.Utilities;
using TmsApi.Infrastructure.Services;

namespace TmsApi.Api.Controllers.V2;

[ApiController]
[Route("api/v{version:apiVersion}/courses")]
[ApiVersion("2.0")]
public class CoursesController : ControllerBase
{
    private readonly ICachedCourseService _cachedCourseService;
    private readonly IMediator _mediator;

    public CoursesController(ICachedCourseService cachedCourseService, IMediator mediator)
    {
        _cachedCourseService = cachedCourseService;
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetCourses(
        [FromQuery] string? fields,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var allCourses = await _cachedCourseService.GetAllCoursesAsync(ct);

        var totalCount = allCourses.Count;
        var rows = allCourses
            .OrderBy(c => c.Title)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        var hasNext = page < totalPages;
        var hasPrevious = page > 1;

        // Apply data shaping
        var shaped = rows.ShapeData(fields, CourseDtoFields.Allowed);

        // Build HATEOAS links
        var links = new List<LinkDto>
        {
            new(Url.Action(nameof(GetCourses), new { page, pageSize, fields })!, "self", "GET")
        };

        if (hasNext)
            links.Add(new(Url.Action(nameof(GetCourses), new { page = page + 1, pageSize, fields })!, "next", "GET"));

        if (hasPrevious)
            links.Add(new(Url.Action(nameof(GetCourses), new { page = page - 1, pageSize, fields })!, "prev", "GET"));

        return Ok(new
        {
            Data = shaped,
            Meta = new
            {
                totalCount,
                page,
                pageSize,
                totalPages,
                hasNext,
                hasPrevious
            },
            Links = links
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCourse(int id, CancellationToken ct)
    {
        var allCourses = await _cachedCourseService.GetAllCoursesAsync(ct);
        var course = allCourses.FirstOrDefault(c => c.Id == id);

        if (course is null)
            return NotFound();

        return Ok(new
        {
            Data = course,
            Links = new[]
            {
                new LinkDto(Url.Action(nameof(GetCourse), new { id })!, "self", "GET"),
                new LinkDto("/api/v2/enrollments", "enroll", "POST")
            }
        });
    }
}