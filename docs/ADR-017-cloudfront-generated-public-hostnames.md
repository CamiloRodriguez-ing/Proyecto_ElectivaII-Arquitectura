# ADR-017: CloudFront-generated public hostnames

Status: Accepted

Date: 2026-11-25

## Context

The complete AWS environment needs stable HTTPS entry points for the browser
portal and the Keycloak issuer. No project-owned DNS domain is available, and
buying or delegating one would add cost and external setup to the academic
demonstration.

CloudFront assigns each distribution a `cloudfront.net` hostname and can serve
it with the default AWS-managed `*.cloudfront.net` certificate.

## Decision

Use generated CloudFront HTTPS hostnames instead of custom domain names.

- One CloudFront distribution will serve the Angular portal.
- A separate CloudFront distribution will proxy the public Keycloak endpoints to
  a private EC2 VPC origin with caching disabled and the required HTTP methods,
  headers, query strings, and cookies forwarded.
- The Keycloak distribution hostname will be the exact public issuer base used
  by Keycloak, the API authorizer, token validation, and discovery tests.
- The frontend distribution hostname will be the exact Keycloak redirect URI,
  post-logout redirect URI, web origin, and API CORS origin.
- Terraform outputs will expose both URLs.
- Because generated hostnames do not exist until the distributions are created,
  deployment will include an automated bootstrap/convergence step that applies
  the final hostname to Keycloak and its realm configuration.
- Frontend deployment configuration will be runtime-injected or generated during
  deployment so the final API and issuer URLs do not require hand-editing source
  files.
- CloudFront distributions must be updated in place. Replacing either
  distribution changes its hostname and requires coordinated Keycloak, frontend,
  CORS, and authorizer updates.

## Rationale

The default CloudFront hostnames provide publicly trusted HTTPS without domain
registration, Route 53 hosted-zone charges, or DNS delegation. Separate portal
and identity distributions keep cache and forwarding policies explicit.

## Consequences

- Public URLs are AWS-generated and less memorable than custom domains.
- The deployment has a convergence step after CloudFront assigns the hostnames.
- Distribution replacement is an issuer migration for Keycloak, not a harmless
  infrastructure change.
- Terraform lifecycle protections and documented recovery procedures should
  reduce accidental replacement.
- The architecture can adopt custom domains later without changing private
  origins, but doing so requires a coordinated issuer and redirect migration.

## Presentation summary

AWS supplies both public HTTPS identities. CloudFront serves the portal and acts
as the only public path to the private Keycloak instance, so the demonstration
needs no separately purchased DNS name or certificate.

## References

- [CloudFront default certificate](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesGeneral.html)
- [CloudFront VPC origins](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-vpc-origins.html)
