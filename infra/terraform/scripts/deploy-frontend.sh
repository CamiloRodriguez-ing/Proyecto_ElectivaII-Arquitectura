#!/usr/bin/env bash
set -euo pipefail

source_dir="${1:?frontend source directory is required}"
bucket="${2:?frontend bucket is required}"
api_url="${3:?API URL is required}"
distribution_id="${4:?CloudFront distribution ID is required}"
build_dir=$(mktemp -d)
container_id=""
cleanup() {
  if [[ -n "$container_id" ]]; then docker rm -f "$container_id" >/dev/null 2>&1 || true; fi
  rm -rf -- "$build_dir"
}
trap cleanup EXIT

docker build --file "$source_dir/Dockerfile" --tag academic-frontend-deploy:local "$source_dir"
container_id=$(docker create academic-frontend-deploy:local)
docker cp "$container_id:/usr/share/nginx/html/." "$build_dir/"
jq -n \
  --arg apiUrl "$api_url" \
  '{apiUrl:$apiUrl,tenantId:"sistemas",tenantName:"Ing. Sistemas",logo:"sistemas.png"}' \
  >"$build_dir/runtime-config.json"
aws s3 sync "$build_dir/" "s3://$bucket/" --delete
aws cloudfront create-invalidation --distribution-id "$distribution_id" --paths '/*' >/dev/null
