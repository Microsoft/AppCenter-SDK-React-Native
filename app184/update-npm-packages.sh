#!/bin/bash
set -e

echo 'Removing existing appcenter* packages...'
rm -rf node_modules/appcenter*

echo "Packing appcenter* packages..."
npm pack ../appcenter
npm pack ../appcenter-analytics

echo "Installing appcenter* packages..."
npm install appcenter*.tgz

echo "Cleanup appcenter*.tgz"
rm appcenter*.tgz

echo "Installing other packages..."
npm install

echo "Running jetify to resolve AndroidX compatibility issues..."
# npx jetify

echo "Updating CocoaPods repos..."
# pod repo update

echo "Install shared framework pods..."
(cd ../AppCenterReactNativeShared/ios && pod install)

echo "Build shared framework..."
(cd ../AppCenterReactNativeShared/ios && SRCROOT=`pwd` ./build-fat-framework.sh)

echo "Running pod install..."
(cd ios && pod install)

echo "Copy shared framework pod..."
cp -r ../AppCenterReactNativeShared/Products/AppCenterReactNativeShared ios/Pods/AppCenterReactNativeShared
