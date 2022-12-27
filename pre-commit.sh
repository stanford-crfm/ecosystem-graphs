#!/bin/bash

# This script fails when any of its commands fail.
set -e

if ! [ -e venv ]; then
  python3 -m pip install virtualenv
  python3 -m virtualenv -p python3 venv
fi

venv/bin/pip install -r requirements.txt
venv/bin/pip check

# YAML style checks and linting
echo ""
echo "Running yamlfix"
venv/bin/yamlfix --config-file ./yamlfix.toml ./assets/*.yaml
echo "Checking for YAML formatting."
venv/bin/yamllint -c .yamllint . || (
  echo ""
  echo "YAML formatting failed. Fix the errors and run the check again."
  echo ""
  exit 1
)
echo "YAML formatting succeeded!"
echo ""

echo "Done."
