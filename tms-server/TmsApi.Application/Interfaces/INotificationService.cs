namespace TmsApi.Application.Interfaces;

public interface INotificationService
{
    Task NotifyTranscriptReadyAsync(int studentId, string reportId, string downloadUrl, CancellationToken ct = default);
}