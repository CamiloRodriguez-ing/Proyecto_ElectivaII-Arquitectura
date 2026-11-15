#!/usr/bin/env bash
set -euo pipefail

source_dir="${1:?source directory is required}"
build_dir="${2:?build directory is required}"

case "$build_dir" in
  */.terraform/build/lambda) ;;
  *) echo "Refusing to replace unexpected build directory: $build_dir" >&2; exit 1 ;;
esac

rm -rf -- "$build_dir"
mkdir -p -- "$build_dir"

python3 -m pip install \
  --disable-pip-version-check \
  --platform manylinux2014_x86_64 \
  --implementation cp \
  --python-version 3.11 \
  --only-binary=:all: \
  --requirement "$source_dir/requirements.txt" \
  --target "$build_dir"

cp -R -- "$source_dir"/. "$build_dir"/
find "$build_dir" -type d -name '__pycache__' -prune -exec rm -rf -- {} +
find "$build_dir" -type f -name '*.pyc' -delete
