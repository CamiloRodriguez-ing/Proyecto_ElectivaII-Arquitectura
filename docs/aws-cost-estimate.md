# AWS demonstration cost estimate

Estimate date: 2026-11-25

Region: `us-east-1`
Maximum lifetime: 48 hours

This stack is **not** assumed to be covered by the AWS Free Tier. Promotional
credits can pay eligible charges, but they do not change service rates. Before
apply, the estimate must be checked against the logged-in account, current AWS
Pricing Calculator results, credit expiration, and the saved Terraform plan.

## 48-hour planning estimate

| Cost group | Planning value (USD) | Main assumption |
|---|---:|---|
| MSK Serverless | 36.43 | 48 cluster-hours plus 6 partition-hours per hour; demo traffic is negligible |
| EC2 | 4.82 | one `t3.large` Druid and one `t4g.small` Keycloak, on-demand |
| RDS PostgreSQL, storage, and RDS Proxy | 3.00–4.00 | single-AZ `db.t4g.small`, 20 GiB gp3, two-vCPU proxy |
| NAT Gateway and its public IPv4 | 2.40 | one NAT/EIP; data processing remains small |
| Internal ALB | 1.08–1.50 | hourly ALB charge and low demo LCU usage |
| Secrets endpoint, S3, CloudFront, Lambda, API Gateway, logs, and data transfer | 2.00–6.00 | low-volume academic demonstration |
| **Expected total** | **49.73–55.15** | before taxes and unexpected burst/data charges |
| **Approval ceiling with contingency** | **65.00** | do not apply if the reviewed estimate exceeds this without a new decision |

The USD 120 credit balance is therefore expected to cover one 48-hour run with
roughly USD 55 of headroom against the USD 65 approval ceiling. Credits and
eligibility must still be verified in Billing; the calculation is not a promise
of the final invoice.

> Deployment gate update (2026-11-25): the account UI reports a credit
> expiration date of 2026-11-26. A 48-hour run can no longer finish before that
> date, so the saved plan must not be applied under the original approval model.
> A shorter same-day window or a new source of credits requires a separate,
> explicit cost decision.

## Dominant rates and uncertainty

- MSK Serverless is the dominant fixed charge. AWS lists USD 0.75 per
  cluster-hour and USD 0.0015 per partition-hour in its US East example.
- AWS lists `t3.large` at approximately USD 0.0835 per hour. A `t4g.small` free
  trial may apply to eligible accounts through 2026-12-31, but this estimate
  deliberately assumes paid usage.
- One NAT Gateway is approximately USD 0.045 per hour, plus USD 0.005 per hour
  for its public IPv4 address and processed data.
- An Application Load Balancer starts at USD 0.0225 per hour, plus LCU usage.
- RDS Proxy is USD 0.015 per vCPU-hour with a two-vCPU minimum for provisioned
  databases. Exact RDS instance and storage rates must be refreshed in the AWS
  calculator.
- The Secrets Manager interface endpoint uses two endpoint ENIs and is billed
  per endpoint-AZ hour. CloudFront VPC Origin service-managed private addresses
  do not add a public IPv4 charge.

Primary pricing references:

- [Amazon MSK pricing](https://aws.amazon.com/msk/pricing/)
- [EC2 T3 pricing](https://aws.amazon.com/ec2/instance-types/t3/)
- [EC2 T4g pricing](https://aws.amazon.com/ec2/instance-types/t4/)
- [RDS for PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [RDS Proxy pricing](https://aws.amazon.com/rds/proxy/pricing/)
- [Amazon VPC pricing](https://aws.amazon.com/vpc/pricing/)
- [Elastic Load Balancing pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)
- [AWS PrivateLink pricing](https://aws.amazon.com/privatelink/pricing/)

## Cost controls

- AWS Budgets notifications at USD 25, 50, and 80.
- A saved plan and explicit approval before apply.
- No production redundancy: one Druid host, one Keycloak host, and single-AZ
  RDS for this time-bounded demonstration.
- A human teardown deadline no later than 48 hours after apply.
- Immediate destroy if the USD 50 alert arrives earlier than expected or the
  environment is no longer needed.
- Post-destroy verification of MSK, NAT, RDS, EC2, ALB, CloudFront, and VPC
  Origin resources.
