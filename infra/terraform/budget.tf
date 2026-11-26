resource "aws_budgets_budget" "demo" {
  count        = var.deploy_full_stack && var.budget_notification_email != "" ? 1 : 0
  name         = "${local.name_prefix}-ephemeral-demo"
  budget_type  = "COST"
  limit_amount = "80"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_types {
    include_credit             = false
    include_discount           = true
    include_other_subscription = true
    include_recurring          = true
    include_refund             = false
    include_subscription       = true
    include_support            = true
    include_tax                = true
    include_upfront            = true
    use_amortized              = false
    use_blended                = false
  }

  dynamic "notification" {
    for_each = toset([25, 50, 80])
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "ABSOLUTE_VALUE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_notification_email]
    }
  }
}
