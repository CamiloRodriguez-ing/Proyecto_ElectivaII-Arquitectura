#!/usr/bin/env bash
set -euo pipefail

instance_id="${1:?Keycloak instance ID is required}"
region="${2:?AWS region is required}"
hostname="${3:?Keycloak public hostname is required}"

if [[ ! "$instance_id" =~ ^i-[a-f0-9]+$ ]]; then
  echo "Invalid EC2 instance ID" >&2
  exit 1
fi
if [[ ! "$hostname" =~ ^https://[a-z0-9.-]+$ ]]; then
  echo "Invalid Keycloak HTTPS hostname" >&2
  exit 1
fi

for _ in {1..30}; do
  managed=$(aws ssm describe-instance-information \
    --region "$region" \
    --filters "Key=InstanceIds,Values=$instance_id" \
    --query 'length(InstanceInformationList)' \
    --output text)
  [[ "$managed" == "1" ]] && break
  sleep 10
done
if [[ "${managed:-0}" != "1" ]]; then
  echo "Keycloak instance did not become available in SSM" >&2
  exit 1
fi

parameters=$(jq -cn --arg hostname "$hostname" '{commands:[
  "printf \"%s\\n\" " + ($hostname|@sh) + " > /opt/keycloak/public-hostname",
  "/opt/keycloak/run.sh",
  "until curl -fsS http://localhost:8080/realms/academic-requests >/dev/null; do sleep 5; done"
]}')
command_id=$(aws ssm send-command \
  --region "$region" \
  --instance-ids "$instance_id" \
  --document-name AWS-RunShellScript \
  --parameters "$parameters" \
  --query 'Command.CommandId' \
  --output text)

for _ in {1..60}; do
  status=$(aws ssm get-command-invocation \
    --region "$region" \
    --command-id "$command_id" \
    --instance-id "$instance_id" \
    --query Status \
    --output text 2>/dev/null || true)
  case "$status" in
    Success) exit 0 ;;
    Failed|Cancelled|TimedOut)
      aws ssm get-command-invocation \
        --region "$region" --command-id "$command_id" --instance-id "$instance_id" \
        --query StandardErrorContent --output text >&2 || true
      exit 1
      ;;
  esac
  sleep 5
done

echo "Timed out while setting the Keycloak public hostname" >&2
exit 1
