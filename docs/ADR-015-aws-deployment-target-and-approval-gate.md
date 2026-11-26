# ADR-015: AWS deployment target and approval gate

Status: Accepted

Date: 2026-11-25

## Context

The project will be deployed after local implementation and verification. AWS
resource creation can incur ongoing cost and may replace or duplicate existing
development infrastructure if it is applied without reviewing the plan.

The repository already uses Terraform as its primary infrastructure workflow and
defaults to `us-east-1` and the `dev` environment.

## Decision

- Use AWS region `us-east-1`.
- Use the `dev` environment and its non-production protection/cost profile.
- Keep Terraform as the primary infrastructure-as-code workflow.
- Implement and verify the complete local path before planning AWS changes.
- Run formatting, validation, security checks, and `terraform plan` before any
  apply operation.
- Present the resolved resource plan and material cost-bearing resources for
  explicit user approval before running `terraform apply`.
- Use credentials supplied through the standard AWS credential chain on the
  deployment workstation. Never commit credentials or place them in Terraform
  variables.
- Capture post-deployment outputs and smoke-test evidence for the presentation.

## Rationale

Keeping the repository's existing region and environment avoids an unnecessary
migration. A plan-and-approval gate makes the external state change and expected
cost visible without weakening the objective of performing a real deployment.

## Consequences

- The implementation is not considered deployed merely because Terraform
  validates; an approved apply and post-deployment smoke test are separate
  completion criteria.
- Deployment can pause at the approval gate if credentials, service quotas, or
  the planned cost are unacceptable.
- Terraform state must use protected remote storage before the environment is
  managed collaboratively.

## Presentation summary

The project follows a controlled promotion path: prove the complete architecture
locally, review an immutable infrastructure plan, deploy to `dev` in
`us-east-1`, and record end-to-end smoke-test evidence.
