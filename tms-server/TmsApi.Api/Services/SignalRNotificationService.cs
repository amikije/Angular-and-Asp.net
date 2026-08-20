using Microsoft.AspNetCore.SignalR;
using TmsApi.Api.Hubs;
using TmsApi.Application.Hubs;
using TmsApi.Application.Interfaces;

namespace TmsApi.Api.Services;

public class SignalRNotificationService : INotificationService
{
    private readonly IHubContext<TmsHub, ITmsHubClient> _hubContext;

    public SignalRNotificationService(IHubContext<TmsHub, ITmsHubClient> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyTranscriptReadyAsync(int studentId, string reportId, string downloadUrl, CancellationToken ct = default)
    {
        await _hubContext.Clients
            .Group(GroupNames.Student(studentId.ToString()))
            .ReceiveTranscriptReady(reportId, downloadUrl);
    }
}