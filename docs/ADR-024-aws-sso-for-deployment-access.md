# ADR-024: AWS IAM Identity Center for deployment access

Status: Accepted

Date: 2026-11-25

## Context

The deployment workstation has AWS CLI installed but no currently usable AWS
identity or account-plan session. The final Terraform plan and apply require
human deployment access. Long-lived access keys would add avoidable secret
handling risk to an academic workstation and repository.

## Decision

Use AWS IAM Identity Center (AWS SSO) and an AWS CLI named profile for human
deployment access.

- Configure the profile outside the repository with `aws configure sso`.
- Authenticate interactively with `aws sso login --profile <profile>` before
  Terraform planning or deployment.
- Pass the profile by the standard AWS SDK/CLI credential chain, for example
  through `AWS_PROFILE`; do not put profile credentials in Terraform variables.
- Never commit SSO cache files, tokens, account identifiers, role credentials, or
  generated Terraform state.
- Use a deployment permission set scoped to the resources required by the
  reviewed Terraform plan.
- For the first time-bounded academic deployment, use the AWS-managed
  `AdministratorAccess` permission set temporarily because Terraform creates
  resources across IAM, VPC, EC2, RDS, Lambda, MSK, S3, CloudFront, API Gateway,
  Secrets Manager, Systems Manager, and Budgets. Remove this assignment after
  teardown; any later long-lived environment must replace it with a
  least-privilege deployment permission set derived from the reviewed plan.
- Verify caller identity, region, account plan, promotional-credit expiration,
  and budget configuration before apply without printing sensitive credential
  material into presentation evidence.
- Expired sessions must fail closed and be renewed interactively; automation will
  not fall back to embedded access keys.

## Rationale

SSO provides short-lived credentials and keeps human authentication outside the
codebase. It also makes the final plan/apply approval attributable to an
interactive deployment role.

## Consequences

- The configured deployment profile is `academic-demo`, backed by the SSO
  session `Aws-personal` in `us-east-1`; caller identity was verified before
  planning on 2026-11-25.
- The original saved plan contained 178 creates, zero updates, and zero deletes,
  but ADR-025 invalidated it. It must never be applied; a new plan is required
  after the AWS account decision resumes.
- Fully unattended deployment is not a current requirement.
- The deployment runbook must include SSO login and identity verification steps.
- Temporary administrator access increases impact if the interactive session is
  compromised, so the session is used only for the reviewed deployment and
  teardown window and is never represented by permanent access keys.

## Presentation summary

Infrastructure is deployed with short-lived, interactive AWS credentials; the
project contains no permanent cloud keys.
