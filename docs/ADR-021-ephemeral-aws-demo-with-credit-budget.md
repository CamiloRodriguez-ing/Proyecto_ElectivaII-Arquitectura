# ADR-021: Ephemeral AWS demonstration within promotional credits

Status: Accepted

Date: 2026-11-25

## Context

The AWS account has approximately USD 120 in promotional credits. The complete
architecture includes continuously billed resources, especially Amazon MSK
Serverless, EC2, and RDS. MSK Serverless alone has a per-cluster hourly charge,
so a permanently running environment would exceed the available academic budget.

The project needs a real AWS deployment for verification and presentation, but
does not require a permanently available public environment.

## Decision

Treat the AWS `dev` deployment as an ephemeral demonstration environment.

- Finish unit, contract, security, frontend, and Docker end-to-end verification
  before creating the complete AWS stack.
- Review `terraform plan`, account credit expiration, credit applicability, and
  estimated service cost before apply.
- Limit the initial complete deployment window to a maximum of 48 hours.
- Create AWS Budget notifications at USD 25, USD 50, and USD 80 of tracked
  usage. Credits must not be assumed to make unmonitored usage safe.
- Deploy synthetic demonstration data only after infrastructure health checks
  pass, reducing paid troubleshooting time.
- Capture presentation evidence and post-deployment smoke-test results during
  the active window.
- At the end of the presentation window, run and review the documented teardown
  plan. Remove MSK, EC2, RDS/Proxy, and other continuously billed demonstration
  resources unless the user explicitly approves an extension.
- Preserve only deliberately selected low-cost artifacts or backups, and list
  every retained billable resource after teardown.
- Re-creation must be deterministic from Terraform, versioned configuration,
  realm bootstrap, and synthetic data generation; persistent cloud uptime is not
  the recovery strategy.

## Rationale

A short-lived deployment provides real AWS evidence while keeping the dominant
hourly MSK cost within the available credits. Delaying AWS creation until local
verification also prevents using paid infrastructure as the primary debugging
environment.

## Consequences

- Public URLs and the Keycloak issuer exist only while the demonstration stack
  is active and may change after a full re-creation.
- Operators must execute teardown; stopping only the EC2 instances is
  insufficient because MSK and RDS continue billing.
- Demonstration data must be reproducible rather than dependent on long-lived
  cloud state.
- Promotional credit coverage is checked, not assumed. Any uncovered charge is
  still the account owner's responsibility.
- Extending the environment beyond 48 hours requires a new explicit cost review
  and user approval.

## Deployment gate update

On 2026-11-25, the account UI reported that the promotional credits expire on
2026-11-26. The previously approved 48-hour demonstration window therefore does
not fit inside the verified credit-validity period. The saved Terraform plan is
retained, but `terraform apply` is blocked until one of the following is
explicitly approved and documented: credits are renewed or replaced, the owner
accepts uncovered pay-as-you-go charges, or a new same-day deployment and
teardown window is costed with sufficient operational margin.

## Presentation summary

The project proves a full cloud deployment without pretending that a managed
Kafka cluster is free. Infrastructure is created for a controlled verification
window, evidenced, and then removed reproducibly.

## References

- [Amazon MSK pricing](https://aws.amazon.com/msk/pricing/)
- [AWS Free Tier plans](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)
