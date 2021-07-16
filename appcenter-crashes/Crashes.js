// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const ReactNative = require('react-native');
const AppCenterLog = require('appcenter/appcenter-log');

const { AppCenterReactNativeCrashes } = ReactNative.NativeModules;
const crashesEventEmitter = new ReactNative.NativeEventEmitter(AppCenterReactNativeCrashes);

const LOG_TAG = 'AppCenterCrashes';
const EVENT_BEFORE_SENDING = 'AppCenterErrorReportOnBeforeSending';
const EVENT_SENDING_SUCCEEDED = 'AppCenterErrorReportOnSendingSucceeded';
const EVENT_SENDING_FAILED = 'AppCenterErrorReportOnSendingFailed';

// This is set later if and when the user provides a value for the getErrorAttachments callback
let getErrorAttachmentsMethod = () => { };
const filteredReports = [];

const UserConfirmation = {
    DONT_SEND: 0,
    SEND: 1,
    ALWAYS_SEND: 2
};

const ErrorAttachmentLog = {

    // Create text attachment for an error report
    attachmentWithText(text, fileName) {
        return { text, fileName };
    },

    // Create binary attachment for an error report, binary must be passed as a base64 string
    attachmentWithBinary(data, fileName, contentType) {
        return { data, fileName, contentType };
    }
};

const Crashes = {

    // async - returns a Promise
    generateTestCrash() {
        return AppCenterReactNativeCrashes.generateTestCrash();
    },

    // async - returns a Promise
    hasCrashedInLastSession() {
        return AppCenterReactNativeCrashes.hasCrashedInLastSession();
    },

    // async - returns a Promise
    lastSessionCrashReport() {
        return AppCenterReactNativeCrashes.lastSessionCrashReport();
    },

    // async - returns a Promise
    hasReceivedMemoryWarningInLastSession() {
        return AppCenterReactNativeCrashes.hasReceivedMemoryWarningInLastSession();
    },

    // async - returns a Promise
    isEnabled() {
        return AppCenterReactNativeCrashes.isEnabled();
    },

    // async - returns a Promise
    setEnabled(shouldEnable) {
        return AppCenterReactNativeCrashes.setEnabled(shouldEnable);
    },

    // error value should have ExceptionModel type.
    trackError(error, properties, attachments) {
        return AppCenterReactNativeCrashes.trackException(error, sanitizeProperties(properties), sanitizeProperties(attachments));
    },

    notifyUserConfirmation(userConfirmation) {
        switch (userConfirmation) {
            case UserConfirmation.DONT_SEND:
            case UserConfirmation.SEND:
            case UserConfirmation.ALWAYS_SEND:
                AppCenterReactNativeCrashes.notifyWithUserConfirmation(userConfirmation);
                break;

            default:
                AppCenterLog.error(LOG_TAG, 'Crashes.notifyUserConfirmation: Invalid parameter value.');
                return;
        }
        if (userConfirmation !== UserConfirmation.DONT_SEND) {
            Helper.sendErrorAttachments();
        }
    },

    setListener(listenerMap) {
        crashesEventEmitter.removeAllListeners(EVENT_BEFORE_SENDING);
        crashesEventEmitter.removeAllListeners(EVENT_SENDING_SUCCEEDED);
        crashesEventEmitter.removeAllListeners(EVENT_SENDING_FAILED);
        if (!listenerMap) {
            return;
        }
        if (listenerMap.onBeforeSending) {
            crashesEventEmitter.addListener(EVENT_BEFORE_SENDING, listenerMap.onBeforeSending);
        }
        if (listenerMap.onSendingSucceeded) {
            crashesEventEmitter.addListener(EVENT_SENDING_SUCCEEDED, listenerMap.onSendingSucceeded);
        }
        if (listenerMap.onSendingFailed) {
            crashesEventEmitter.addListener(EVENT_SENDING_FAILED, listenerMap.onSendingFailed);
        }
        getErrorAttachmentsMethod = listenerMap.getErrorAttachments;
        Crashes.isEnabled()
        .then((isEnabled) => {
            if (isEnabled) {
                return AppCenterReactNativeCrashes.getUnprocessedCrashReports();
            }
            throw new Error('Crashes service is not enabled.');
        })
        .then((reports) => {
            if (reports.length > 0) {
                const filteredReportIds = [];
                reports.forEach((report) => {
                    if (!listenerMap.shouldProcess
                        || listenerMap.shouldProcess(report)) {
                        filteredReports.push(report);
                        filteredReportIds.push(report.id);
                    }
                });
                return AppCenterReactNativeCrashes.sendCrashReportsOrAwaitUserConfirmationForFilteredIds(filteredReportIds);
            }
            throw new Error('No unprocessed crash reports found.');
        })
        .then((alwaysSend) => {
            if (alwaysSend) {
                Helper.sendErrorAttachments();
            } else if (!listenerMap.shouldAwaitUserConfirmation || !listenerMap.shouldAwaitUserConfirmation()) {
                Crashes.notifyUserConfirmation(UserConfirmation.SEND);
            }
        })
        .catch((error) => console.log(error.message));
    }
};

const Helper = {
    sendErrorAttachments() {
        if (!getErrorAttachmentsMethod) {
            return;
        }
        filteredReports.forEach((report) => {
            Promise.resolve(getErrorAttachmentsMethod(report))
            .then((attachments) => AppCenterReactNativeCrashes.sendErrorAttachments(attachments, report.id))
            .catch((error) => AppCenterLog.error(LOG_TAG, `Could not send error attachments. Error: ${error}`));
        });

        // Prevent multipe calls if shouldAwaitUserConfirmation is false and user calling notifyUserConfirmation for some reason
        filteredReports.length = 0;
    }
};

// Exports with "curly braces".
Crashes.UserConfirmation = UserConfirmation;
Crashes.ErrorAttachmentLog = ErrorAttachmentLog;
Crashes.ExceptionModel = class {
    wrapperSdkName = "react-native-sdk";

    constructor(type, message, stack) {
        this["type"] = type;
        this["message"] = message;
        this["stackTrace"] = stack;
    }

    // error value should have Error type.
    static createFromError(error) {
        return new Crashes.ExceptionModel(error.name, error.message, error.stack);
    }

    static createFromTypeAndMessage(type, message, stacktrace) {
        return new Crashes.ExceptionModel(type, message, stacktrace);
    }
};

// Export main class without "curly braces".
module.exports = Crashes;

function sanitizeProperties(props) {
    if (props === null) {
        return undefined;
    }
    return props;
}
