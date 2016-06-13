#!/usr/bin/env bash

cd $(dirname $0)/..
set -e

echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
chmod 0600 .npmrc

cp -f package.json build/src/rules/

echo "Publishing..."
npm publish build/src/rules
