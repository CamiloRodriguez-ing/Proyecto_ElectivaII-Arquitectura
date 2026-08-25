param([Parameter(Mandatory=$true)][string]$BaseUrl)
$headers = @{'x-request-id' = 'smoke-test'}
$validRequest = @{student=@{student_code='202012345';name='Student';email='student@university.edu.co'};type='CREDIT_TRANSFER';academic_data=@{source_course='Calculus I';target_course='Differential Calculus';source_credits=3;target_credits=3};documents=@()} | ConvertTo-Json -Depth 5
$review = @{request=@{request_id='11111111-1111-4111-8111-111111111111';status='UNDER_REVIEW';version=2};evaluation=@{decision='APPROVE';observation='Approved by smoke test';actor=@{id='admin-demo';role='ADMINISTRATOR'}}} | ConvertTo-Json -Depth 5
$notification = @{event=@{event_type='request.status_changed.v1';data=@{new_status='APPROVED'}};recipient=@{email='student@university.edu.co'}} | ConvertTo-Json -Depth 5
$analytics = @{requests=@(@{type='CREDIT_TRANSFER';status='APPROVED'})} | ConvertTo-Json -Depth 5
$checks = @(
    @{path='/v1/health';method='Get';body=$null;status=200},
    @{path='/v1/requests/validate';method='Post';body=$validRequest;status=200},
    @{path='/v1/requests/prepare';method='Post';body=$validRequest;status=201},
    @{path='/v1/reviews/evaluate';method='Post';body=$review;status=200},
    @{path='/v1/notifications/preview';method='Post';body=$notification;status=200},
    @{path='/v1/analytics/summary';method='Post';body=$analytics;status=200}
)
foreach ($check in $checks) {
    $requestParameters = @{Uri=($BaseUrl + $check.path);Method=$check.method;Headers=$headers;UseBasicParsing=$true}
    if ($check.body) { $requestParameters.Body = $check.body; $requestParameters.ContentType = 'application/json' }
    $response = Invoke-WebRequest @requestParameters
    if ($response.StatusCode -ne $check.status -or $response.Headers.'Content-Type' -notlike 'application/json*') { throw "Smoke test failed for $($check.path)" }
    if (-not ($response.Content | ConvertFrom-Json).meta.request_id) { throw "Missing request_id for $($check.path)" }
}
Write-Output 'All route smoke tests passed.'
