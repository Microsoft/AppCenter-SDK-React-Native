# This podspec is intended to be used as local pod reference during development,
# while the `AppCenterReactNativeShared.podspec` is only used in the official SDK releases.

Pod::Spec.new do |s|
  s.name              = 'AppCenterReactNativeShared'
  s.version           = '4.2.1'
  s.summary           = 'React Native plugin for Visual Studio App Center'
  s.license           = { :type => 'MIT',  :file => 'AppCenterReactNativeShared/LICENSE' }
  s.homepage          = 'https://github.com/microsoft/appcenter-sdk-react-native'
  s.documentation_url = "https://docs.microsoft.com/en-us/appcenter/"
  s.author            = { 'Microsoft' => 'appcentersdk@microsoft.com' }
  system("SRCROOT=#{__dir__}/../ios #{__dir__}/../prepare-local-podspec.sh")
  s.source            = { :http => "file://#{__dir__}/AppCenter-SDK-ReactNative-iOS-Pod-#{s.version}.zip"}
  s.platform          = :ios, '9.0'
  s.requires_arc      = true
  s.vendored_frameworks = 'AppCenterReactNativeShared/AppCenterReactNativeShared.xcframework'
  s.dependency 'AppCenter/Core', '4.2.0-12'
end
