using System.Threading.Channels;
using System.Threading.RateLimiting;
using Asp.Versioning;
using FluentValidation;
using HealthChecks.NpgSql;
using MediatR;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;
using Polly.Timeout;
using Scalar.AspNetCore;
using System.Text;
using TmsApi.Api.Authorization;
using TmsApi.Api.ExceptionHandlers;
using TmsApi.Api.Filters;
using TmsApi.Api.Hubs;
using TmsApi.Api.Middleware;
using TmsApi.Api.RateLimiting;
using TmsApi.Api.Services;
using TmsApi.Application;
using TmsApi.Application.Behaviors;
using TmsApi.Application.Enrollments.Commands;
using TmsApi.Application.Enrollments.Queries;
using TmsApi.Application.Interfaces;
using TmsApi.Application.Services;
using TmsApi.Application.Transcripts;
using TmsApi.Infrastructure.Data;
using TmsApi.Infrastructure.ExternalServices;
using TmsApi.Infrastructure.Identity;
using TmsApi.Infrastructure.Persistence;
using TmsApi.Infrastructure.Repositories;
using TmsApi.Infrastructure.Services;
using TmsApi.Infrastructure.Transcripts;
using TmsApi.Infrastructure.Workers;
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);

// ============================================================================
// SERVICE REGISTRATION
// ============================================================================

RegisterCors(builder);
RegisterDatabase(builder);
RegisterIdentity(builder);
RegisterJwtAuthentication(builder);
RegisterAuthorizationPolicies(builder);  // ← ADD THIS
RegisterLogging(builder);
RegisterControllersAndVersioning(builder);
RegisterMediatRAndValidation(builder);
RegisterExceptionHandling(builder);
RegisterCaching(builder);
RegisterRateLimiting(builder);
RegisterResilience(builder);
RegisterSignalR(builder);
RegisterCertificateService(builder);
RegisterTranscriptQueue(builder);
RegisterHealthChecks(builder);
RegisterOpenTelemetry(builder);
RegisterOpenApiDocuments(builder);
RegisterAntiforgery(builder);
RegisterRepositoriesAndServices(builder);
RegisterDiValidation(builder);

// ============================================================================
// BUILD APPLICATION
// ============================================================================

var app = builder.Build();

Console.WriteLine($"🌐 Environment: {app.Environment.EnvironmentName}");

ApplyMigrationsAndSeedDatabase(app);
ConfigureMiddlewarePipeline(app);
MapEndpoints(app);

app.Run();

// ============================================================================
// SERVICE REGISTRATION METHODS
// ============================================================================

static void RegisterCors(WebApplicationBuilder builder)
{
    var allowedOrigins = builder.Configuration
        .GetSection("AllowedOrigins")
        .Get<string[]>() ?? new[] { "http://localhost:4200" };

    Console.WriteLine($"✅ CORS Allowed Origins: {string.Join(", ", allowedOrigins)}");

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("TmsClient", policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials()
                  .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
        });
    });
}

static void RegisterDatabase(WebApplicationBuilder builder)
{
    builder.Services.AddDbContext<TmsDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("TmsDatabase"))
            .LogTo(Console.WriteLine, LogLevel.Information)
            .EnableSensitiveDataLogging());
}

static void RegisterIdentity(WebApplicationBuilder builder)
{
    builder.Services.AddIdentityCore<TmsUser>(options =>
    {
        options.Password.RequiredLength = 12;
        options.Password.RequireUppercase = true;
        options.Password.RequireDigit = true;
        options.Password.RequireNonAlphanumeric = true;

        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.AllowedForNewUsers = true;

        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<TmsDbContext>()
    .AddDefaultTokenProviders();

    Console.WriteLine("✅ Identity services configured");
}

static void RegisterJwtAuthentication(WebApplicationBuilder builder)
{
    var jwtKey = builder.Configuration["Jwt:Key"]
        ?? throw new InvalidOperationException("JWT Key not configured. Run: dotnet user-secrets set \"Jwt:Key\" \"your-secret-key\"");

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            )
        };
    });

    builder.Services.AddScoped<TokenService>();

    Console.WriteLine("✅ JWT Authentication configured");
}

static void RegisterAuthorizationPolicies(WebApplicationBuilder builder)
{
    builder.Services.AddAuthorizationBuilder()
        .AddPolicy("CanEditCourse", policy =>
            policy.Requirements.Add(new CourseInstructorRequirement()));

    builder.Services.AddSingleton<IAuthorizationHandler, CourseInstructorHandler>();

    Console.WriteLine("✅ Authorization policies configured");
}

static void RegisterLogging(WebApplicationBuilder builder)
{
    builder.Logging.AddJsonConsole(options =>
    {
        options.IncludeScopes = true;
        options.JsonWriterOptions = new() { Indented = false };
    });
}

static void RegisterControllersAndVersioning(WebApplicationBuilder builder)
{
    builder.Services.AddControllers(options =>
    {
        options.Filters.Add<AuditLogFilter>();
    });

    builder.Services.AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
        options.ApiVersionReader = new UrlSegmentApiVersionReader();
    })
    .AddApiExplorer(options =>
    {
        options.GroupNameFormat = "'v'VVV";
        options.SubstituteApiVersionInUrl = true;
    });
}

static void RegisterMediatRAndValidation(WebApplicationBuilder builder)
{
    var assembly = typeof(Program).Assembly;

    builder.Services.AddMediatR(cfg =>
    {
        cfg.RegisterServicesFromAssembly(assembly);
    });

    builder.Services.AddValidatorsFromAssembly(assembly);

    builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
    builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
}

static void RegisterExceptionHandling(WebApplicationBuilder builder)
{
    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
    builder.Services.AddProblemDetails();
}

static void RegisterCaching(WebApplicationBuilder builder)
{
    builder.Services.AddHybridCache(options =>
    {
        options.DefaultEntryOptions = new HybridCacheEntryOptions
        {
            Expiration = TimeSpan.FromMinutes(10),
            LocalCacheExpiration = TimeSpan.FromMinutes(2)
        };
    });
}

static void RegisterRateLimiting(WebApplicationBuilder builder)
{
    builder.Services.AddRateLimiter(options =>
    {
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        {
            var origin = httpContext.Request.Headers.Origin.ToString();
            if (origin.Contains("localhost:4200") || origin.Contains("localhost:4300"))
            {
                return RateLimitPartition.GetNoLimiter("angular-dev");
            }

            var (partitionKey, tier) = ApiKeyResolver.Resolve(httpContext);

            return tier switch
            {
                ApiKeyTier.Paid => RateLimitPartition.GetTokenBucketLimiter(
                    $"paid:{partitionKey}",
                    _ => new TokenBucketRateLimiterOptions
                    {
                        TokenLimit = 200,
                        TokensPerPeriod = 100,
                        ReplenishmentPeriod = TimeSpan.FromSeconds(10),
                        QueueLimit = 0,
                        AutoReplenishment = true
                    }),

                ApiKeyTier.Free => RateLimitPartition.GetTokenBucketLimiter(
                    $"free:{partitionKey}",
                    _ => new TokenBucketRateLimiterOptions
                    {
                        TokenLimit = 30,
                        TokensPerPeriod = 10,
                        ReplenishmentPeriod = TimeSpan.FromSeconds(10),
                        QueueLimit = 0,
                        AutoReplenishment = true
                    }),

                _ => RateLimitPartition.GetTokenBucketLimiter(
                    $"anon:{partitionKey}",
                    _ => new TokenBucketRateLimiterOptions
                    {
                        TokenLimit = 10,
                        TokensPerPeriod = 5,
                        ReplenishmentPeriod = TimeSpan.FromSeconds(10),
                        QueueLimit = 0,
                        AutoReplenishment = true
                    })
            };
        });

        // ✅ Rate limiting for auth endpoints
        options.AddTokenBucketLimiter("auth", opt =>
        {
            opt.TokenLimit = 5;
            opt.TokensPerPeriod = 1;
            opt.ReplenishmentPeriod = TimeSpan.FromMinutes(1);
            opt.QueueLimit = 0;
            opt.AutoReplenishment = true;
        });

        options.AddTokenBucketLimiter("search", opt =>
        {
            opt.TokenLimit = 10;
            opt.TokensPerPeriod = 5;
            opt.ReplenishmentPeriod = TimeSpan.FromSeconds(10);
            opt.QueueLimit = 2;
            opt.AutoReplenishment = true;
        });

        options.AddConcurrencyLimiter("transcripts", opt =>
        {
            opt.PermitLimit = 5;
            opt.QueueLimit = 20;
            opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        });

        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.OnRejected = async (context, ct) =>
        {
            var retryAfter = "10";
            if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var ts))
                retryAfter = ((int)ts.TotalSeconds).ToString();

            context.HttpContext.Response.Headers.RetryAfter = retryAfter;
            context.HttpContext.Response.ContentType = "application/problem+json";

            await context.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Title = "Rate limit exceeded",
                Detail = $"Too many requests. Retry after {retryAfter} seconds.",
                Status = StatusCodes.Status429TooManyRequests,
                Type = "https://tms.local/errors/rate_limit_exceeded"
            }, ct);
        };
    });
}

static void RegisterResilience(WebApplicationBuilder builder)
{
    builder.Services.AddResiliencePipeline("certificate-api", pipeline =>
    {
        pipeline
            .AddTimeout(TimeSpan.FromSeconds(5))
            .AddCircuitBreaker(new CircuitBreakerStrategyOptions
            {
                FailureRatio = 0.5,
                MinimumThroughput = 10,
                SamplingDuration = TimeSpan.FromSeconds(30),
                BreakDuration = TimeSpan.FromSeconds(15),
                ShouldHandle = new PredicateBuilder()
                    .Handle<HttpRequestException>()
                    .Handle<TimeoutRejectedException>(),
                OnOpened = _ =>
                {
                    Console.WriteLine("🔴 Circuit OPENED - stopping requests to certificate service");
                    return ValueTask.CompletedTask;
                },
                OnClosed = _ =>
                {
                    Console.WriteLine("🟢 Circuit CLOSED - certificate service recovered");
                    return ValueTask.CompletedTask;
                }
            })
            .AddRetry(new RetryStrategyOptions
            {
                MaxRetryAttempts = 3,
                Delay = TimeSpan.FromMilliseconds(500),
                BackoffType = DelayBackoffType.Exponential,
                UseJitter = true,
                ShouldHandle = new PredicateBuilder()
                    .Handle<HttpRequestException>()
                    .Handle<TimeoutRejectedException>(),
                OnRetry = args =>
                {
                    Console.WriteLine(
                        $"🔄 Retry #{args.AttemptNumber} after {args.RetryDelay.TotalMilliseconds:F0}ms ({args.Outcome.Exception?.GetType().Name})");
                    return ValueTask.CompletedTask;
                }
            });
    });
}

static void RegisterSignalR(WebApplicationBuilder builder)
{
    builder.Services.AddSignalR();
}

static void RegisterCertificateService(WebApplicationBuilder builder)
{
    builder.Services.AddHttpClient<ICertificateService, CertificateService>((sp, client) =>
    {
        var baseUrl = sp.GetRequiredService<IConfiguration>().GetValue<string>("TmsApi:PublicBaseUrl")
            ?? "https://localhost:5001";
        client.BaseAddress = new Uri(baseUrl);
    });
}

static void RegisterTranscriptQueue(WebApplicationBuilder builder)
{
    builder.Services.AddSingleton(Channel.CreateBounded<TranscriptRequest>(
        new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait
        }));

    builder.Services.AddSingleton<ITranscriptStatusStore, InMemoryTranscriptStatusStore>();
    builder.Services.AddScoped<INotificationService, SignalRNotificationService>();
    builder.Services.AddHostedService<TranscriptWorker>();
}

static void RegisterHealthChecks(WebApplicationBuilder builder)
{
    builder.Services.AddHealthChecks()
        .AddCheck("self", () => HealthCheckResult.Healthy("alive"), tags: ["live"])
        .AddNpgSql(
            connectionString: builder.Configuration.GetConnectionString("TmsDatabase")!,
            name: "postgres",
            tags: ["ready"]);
}

static void RegisterOpenTelemetry(WebApplicationBuilder builder)
{
    const string serviceName = "tms-api";

    builder.Services.AddOpenTelemetry()
        .ConfigureResource(r => r.AddService(serviceName: serviceName, serviceVersion: "1.0.0"))
        .WithTracing(t => t
            .AddSource(serviceName)
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter())
        .WithMetrics(m => m
            .AddMeter(serviceName)
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter());
}

static void RegisterOpenApiDocuments(WebApplicationBuilder builder)
{
    builder.Services.AddOpenApi("v1", options =>
    {
        options.ShouldInclude = description => description.GroupName == "v1";
    });

    builder.Services.AddOpenApi("v2", options =>
    {
        options.ShouldInclude = description => description.GroupName == "v2";
    });
}

static void RegisterAntiforgery(WebApplicationBuilder builder)
{
    builder.Services.AddAntiforgery(options =>
    {
        options.HeaderName = "X-XSRF-TOKEN";
    });
}

static void RegisterRepositoriesAndServices(WebApplicationBuilder builder)
{
    builder.Services.AddScoped<ICourseRepository, CourseRepository>();
    builder.Services.AddScoped<IEnrollmentRepository, EnrollmentRepository>();
    builder.Services.AddScoped<ICourseService, CourseService>();
    builder.Services.AddScoped<ICachedCourseService, CachedCourseService>();
}

static void RegisterDiValidation(WebApplicationBuilder builder)
{
    builder.Host.UseDefaultServiceProvider(options =>
    {
        options.ValidateScopes = true;
        options.ValidateOnBuild = true;
    });
}

// ============================================================================
// STARTUP TASKS
// ============================================================================

static void ApplyMigrationsAndSeedDatabase(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<TmsDbContext>();

    try
    {
        context.Database.Migrate();
        Console.WriteLine("✅ Database migrations applied successfully");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Database migration failed: {ex.Message}");
    }
}

// ============================================================================
// MIDDLEWARE PIPELINE
// ============================================================================

static void ConfigureMiddlewarePipeline(WebApplication app)
{
    app.UseRouting();
    app.UseCors("TmsClient");

    app.UseAuthentication();
    app.UseAuthorization();

    app.UseExceptionHandler();
    app.UseStatusCodePages();
    app.UseMiddleware<V1DeprecationMiddleware>();
    app.UseMiddleware<SecurityHeadersMiddleware>();  // ← ADD THIS
    app.UseRateLimiter();

    app.Use(async (context, next) =>
    {
        if (context.User.Identity?.IsAuthenticated == true ||
            context.Request.Cookies.ContainsKey("tms_auth"))
        {
            var antiforgery = context.RequestServices
                .GetRequiredService<IAntiforgery>();

            var tokens = antiforgery.GetAndStoreTokens(context);

            context.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken,
                new CookieOptions
                {
                    HttpOnly = false,
                    Secure = !app.Environment.IsDevelopment(),
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTimeOffset.UtcNow.AddHours(2)
                });
        }

        await next(context);
    });
}

// ============================================================================
// ENDPOINT MAPPING
// ============================================================================

static void MapEndpoints(WebApplication app)
{
    app.MapHub<TmsHub>("/hubs/tms")
       .RequireCors("TmsClient")
       .RequireAuthorization();

    app.MapHealthChecks("/health/live", new HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("live")
    }).DisableRateLimiting();

    app.MapHealthChecks("/health/ready", new HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("ready")
    }).DisableRateLimiting();

    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options
            .AddDocument("v1", "Version 1")
            .AddDocument("v2", "Version 2");
    });

    app.MapControllers();

    var attempts = 0;
    app.MapPost("/fake/certificates", async () =>
    {
        var n = Interlocked.Increment(ref attempts);

        if (n % 7 == 0)
        {
            await Task.Delay(TimeSpan.FromSeconds(20));
            return Results.Ok(new { Status = "issued", Attempt = n });
        }
        if (n % 3 != 0)
        {
            return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
        if (n % 11 == 0)
        {
            return Results.BadRequest(new { error = "validation_failed" });
        }
        return Results.Ok(new { Status = "issued", Attempt = n });
    }).WithTags("lab-fixtures");
}