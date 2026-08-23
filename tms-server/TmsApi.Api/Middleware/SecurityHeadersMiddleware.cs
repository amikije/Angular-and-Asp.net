namespace TmsApi.Api.Middleware;

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IWebHostEnvironment _env;

    public SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment env)
    {
        _next = next;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

        // ✅ Updated CSP with font-src and connect-src for Scalar
        if (_env.IsDevelopment())
        {
            context.Response.Headers.Append(
                "Content-Security-Policy",
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:4200; " +
                "style-src 'self' 'unsafe-inline'; " +
                "font-src 'self' https://fonts.scalar.com; " +  // ← Allow Scalar fonts
                "connect-src 'self' https://api.scalar.com http://localhost:4200 https://localhost:5001; " +  // ← Allow Scalar API
                "img-src 'self' data:;"
            );
        }
        else
        {
            context.Response.Headers.Append(
                "Content-Security-Policy",
                "default-src 'self'; " +
                "font-src 'self' https://fonts.scalar.com; " +
                "connect-src 'self' https://api.scalar.com;"
            );
        }

        context.Response.Headers.Append(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera=()"
        );

        await _next(context);
    }
}