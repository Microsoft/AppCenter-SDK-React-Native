// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

#import "AppCenterReactNativeCrashes.h"

// Support React Native headers both in the React namespace, where they are in
// RN version 0.40+, and no namespace, for older versions of React Native
#if __has_include(<React/RCTAssert.h>)
#import <React/RCTAssert.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTConvert.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTRootView.h>
#import <React/RCTUtils.h>
#else
#import "RCTAssert.h"
#import "RCTBridgeModule.h"
#import "RCTConvert.h"
#import "RCTEventDispatcher.h"
#import "RCTRootView.h"
#import "RCTUtils.h"
#endif

#import "AppCenterReactNativeCrashesDelegate.h"
#import "AppCenterReactNativeCrashesUtils.h"

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wincomplete-umbrella"
#import <AppCenterCrashes/MSACWrapperCrashesHelper.h>
#pragma GCC diagnostic pop

#import <AppCenter/MSACAppCenter.h>
#import <AppCenterCrashes/AppCenterCrashes.h>
#import <AppCenterCrashes/MSACWrapperExceptionModel.h>
#import <AppCenterReactNativeShared/AppCenterReactNativeShared.h>

@implementation AppCenterReactNativeCrashes

static const int kMSACUserConfirmationDontSendJS = 0;
static const int kMSACUserConfirmationSendJS = 1;
static const int kMSACUserConfirmationAlwaysSendJS = 2;

static dispatch_once_t onceToken;
static AppCenterReactNativeCrashesDelegate *crashesDelegate = nil;

RCT_EXPORT_MODULE();

+ (void)register {
  [MSACWrapperCrashesHelper setAutomaticProcessing:NO];
  [MSACCrashes setDelegate:[AppCenterReactNativeCrashes sharedCrashesDelegate]];
  [AppCenterReactNativeShared configureAppCenter];
  if ([MSACAppCenter isConfigured]) {
    [MSACAppCenter startService:[MSACCrashes class]];
  }
}

+ (void)registerWithAutomaticProcessing {
  [AppCenterReactNativeShared configureAppCenter];
  [MSACCrashes setDelegate:[AppCenterReactNativeCrashes sharedCrashesDelegate]];

  [MSACAppCenter startService:[MSACCrashes class]];
}

- (instancetype)init {
  self = [super init];

  if (self) {
    [crashesDelegate setEventEmitter:self];
  }

  return self;
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSDictionary *)constantsToExport {
  return @{};
}

- (NSArray<NSString *> *)supportedEvents {
  return [crashesDelegate supportedEvents];
}

- (void)startObserving {
  // Will be called when this module's first listener is added.
  [crashesDelegate startObserving];
}

- (void)stopObserving {
  // Will be called when this module's last listener is removed, or on dealloc.
  [crashesDelegate stopObserving];
}

RCT_EXPORT_METHOD(hasCrashedInLastSession : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject) {
  void (^fetchHasCrashedInLastSession)(void) = ^void() {
    MSACErrorReport *report = [MSACCrashes lastSessionCrashReport];
    resolve(report != nil ? @YES : @NO);
  };
  dispatch_async(dispatch_get_main_queue(), fetchHasCrashedInLastSession);
}

RCT_EXPORT_METHOD(hasReceivedMemoryWarningInLastSession : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject) {
  void (^fetchHasReceivedMemoryWarning)(void) = ^void() {
    BOOL memoryWarning = [MSACCrashes hasReceivedMemoryWarningInLastSession];
    resolve(@(memoryWarning));
  };
  dispatch_async(dispatch_get_main_queue(), fetchHasReceivedMemoryWarning);
}

RCT_EXPORT_METHOD(lastSessionCrashReport : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject) {
  void (^fetchLastSessionCrashReport)(void) = ^void() {
    MSACErrorReport *report = [MSACCrashes lastSessionCrashReport];
    resolve(convertReportToJS(report));
  };
  dispatch_async(dispatch_get_main_queue(), fetchLastSessionCrashReport);
}

RCT_EXPORT_METHOD(isDebuggerAttached : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject) {
  resolve([NSNumber numberWithBool:[MSACAppCenter isDebuggerAttached]]);
}

RCT_EXPORT_METHOD(isEnabled : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject) {
  resolve(@([MSACCrashes isEnabled]));
}

RCT_EXPORT_METHOD(trackException :(NSDictionary *)exception
                   withProperties:(nullable NSDictionary *)properties
                      attachments:(nullable NSArray *)attachments
                         resolver:(RCTPromiseResolveBlock)resolve 
                         rejecter:(RCTPromiseRejectBlock)reject) {
  NSString *type = exception[@"type"];
  NSString *message = exception[@"message"];
  NSArray<NSString *> *stackTrace = exception[@"stackTrace"];
  NSString *wrapperSdkName = exception[@"wrapperSdkName"];
  if (!type || [type isEqual: @""]) {
    reject(@"appcenter_failure", @"Type value shouldn't be nil or empty.", nil);
    return;
  }
  if (!message || [message isEqual: @""]) {
    reject(@"appcenter_failure", @"Message value shouldn't be nil or empty.", nil);
    return;
  }
  MSACWrapperExceptionModel *exceptionModel = [MSACWrapperExceptionModel new];
  exceptionModel.type = type;
  exceptionModel.message = message;
  exceptionModel.wrapperSdkName = wrapperSdkName;
  if (!stackTrace) {
    stackTrace = [NSThread callStackSymbols];
  }
  exceptionModel.stackTrace = stackTrace.description;
  [MSACCrashes trackException:exceptionModel withProperties:properties attachments:convertJSAttachmentsToNativeAttachments(attachments)];
  resolve(nil);
}

RCT_EXPORT_METHOD(setEnabled : (BOOL)shouldEnable resolver : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject) {
  [MSACCrashes setEnabled:shouldEnable];
  resolve(nil);
}

RCT_EXPORT_METHOD(generateTestCrash : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject) {
  [MSACCrashes generateTestCrash];
  resolve(nil);
}

RCT_EXPORT_METHOD(notifyWithUserConfirmation
                  : (int)userConfirmation resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
  switch (userConfirmation) {
  case kMSACUserConfirmationDontSendJS:
    [MSACCrashes notifyWithUserConfirmation:MSACUserConfirmationDontSend];
    break;
  case kMSACUserConfirmationSendJS:
    [MSACCrashes notifyWithUserConfirmation:MSACUserConfirmationSend];
    break;
  case kMSACUserConfirmationAlwaysSendJS:
    [MSACCrashes notifyWithUserConfirmation:MSACUserConfirmationAlways];
    break;
  default:
    // Let native SDK valitade and log an error for unknown value
    [MSACCrashes notifyWithUserConfirmation:userConfirmation];
    break;
  }
  resolve(nil);
}

#pragma mark MSACWrapperCrashesHelper Methods

/**
 * Gets a list of unprocessed crash reports.
 */
RCT_EXPORT_METHOD(getUnprocessedCrashReports : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject) {
  void (^fetchUnprocessedCrashReports)(void) = ^void() {
    NSArray *unprocessedCrashReports = [MSACWrapperCrashesHelper unprocessedCrashReports];
    resolve(convertReportsToJS(unprocessedCrashReports));
  };
  dispatch_async(dispatch_get_main_queue(), fetchUnprocessedCrashReports);
}

/**
 * Resumes processing for a list of error reports that is a subset of the
 * unprocessed reports.
 */
RCT_EXPORT_METHOD(sendCrashReportsOrAwaitUserConfirmationForFilteredIds
                  : (NSArray *)filteredIds resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
  BOOL alwaysSend = [MSACWrapperCrashesHelper sendCrashReportsOrAwaitUserConfirmationForFilteredIds:filteredIds];
  resolve([NSNumber numberWithBool:alwaysSend]);
}

/**
 * Sends error attachments for a particular error report.
 */
RCT_EXPORT_METHOD(sendErrorAttachments
                  : (NSArray *)errorAttachments forIncidentIdentifier
                  : (NSString *)incidentId resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
  [MSACWrapperCrashesHelper sendErrorAttachments:convertJSAttachmentsToNativeAttachments(errorAttachments) withIncidentIdentifier:incidentId];
  resolve(nil);
}

+ (AppCenterReactNativeCrashesDelegate *)sharedCrashesDelegate {
  dispatch_once(&onceToken, ^{
    if (crashesDelegate == nil) {
      crashesDelegate = [AppCenterReactNativeCrashesDelegate new];
    }
  });
  return crashesDelegate;
}

@end
