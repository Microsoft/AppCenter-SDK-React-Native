// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

#import "AppCenterReactNativeRemoteOperationDelegate.h"
#import "AppCenterReactNativeDataContants.h"
#import "AppCenterReactNativeDataUtils.h"
#import <AppCenterData/MSData.h>
#import <AppCenterData/MSDataError.h>
#import <AppCenterData/MSDictionaryDocument.h>
#import <AppCenterData/MSDocumentWrapper.h>

#if __has_include(<React/RCTEventDispatcher.h>)
#import <React/RCTEventDispatcher.h>
#else
#import "RCTEventDispatcher.h"
#endif

static NSString *const ON_REMOTE_OPERATION_COMPLETED_EVENT = @"AppCenterRemoteOperationCompleted";

@implementation AppCenterReactNativeRemoteOperationDelegate {
  bool hasListeners;
}

- (instancetype)init {
  return self;
}

- (void)data:(MSData *)data
    didCompletePendingOperation:(NSString *)operation
                    forDocument:(MSDocumentWrapper *_Nullable)document
                      withError:(MSDataError *_Nullable)error {
  if (hasListeners) {
    NSMutableDictionary *jsDocumentWrapper = [[NSMutableDictionary alloc] init];

    // TODO: Once updated to the latest native iOS sdk, create a new object based of MSDocumentMetadata.
    [AppCenterReactNativeDataUtils addDocumentWrapperMetaData:jsDocumentWrapper document:document includeAll:NO];

    // Add error.
    if (document.error) {
      NSMutableDictionary *errorDict = [[NSMutableDictionary alloc] init];
      errorDict[kMSMessageKey] = document.error.description;
      jsDocumentWrapper[kMSErrorKey] = errorDict;
    } else {
      jsDocumentWrapper[kMSErrorKey] = nil;
    }
    [self.eventEmitter sendEventWithName:ON_REMOTE_OPERATION_COMPLETED_EVENT body:jsDocumentWrapper];
  }
}

- (NSArray<NSString *> *)supportedEvents {
  return @[ ON_REMOTE_OPERATION_COMPLETED_EVENT ];
}

- (void)startObserving {
  hasListeners = YES;
}

- (void)stopObserving {
  hasListeners = NO;
}

@end
