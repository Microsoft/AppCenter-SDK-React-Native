// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.appcenter.reactnative.crashes;

import android.util.Base64;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.microsoft.appcenter.crashes.ingestion.models.ErrorAttachmentLog;
import com.microsoft.appcenter.crashes.model.ErrorReport;
import com.microsoft.appcenter.ingestion.models.Device;
import com.microsoft.appcenter.crashes.ingestion.models.Exception;

import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONStringer;

import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;

class AppCenterReactNativeCrashesUtils {
    private static final String LOG_TAG = "AppCenterCrashes";
    private static final String DATA_FIELD = "data";
    private static final String TEXT_FIELD = "text";
    private static final String FILE_NAME_FIELD = "fileName";
    private static final String CONTENT_TYPE_FIELD = "contentType";

    static void logError(String message) {
        Log.e(LOG_TAG, message);
    }

    static void logInfo(String message) {
        Log.i(LOG_TAG, message);
    }

    static void logDebug(String message) {
        Log.d(LOG_TAG, message);
    }

    static WritableMap convertErrorReportToWritableMap(ErrorReport errorReport) throws JSONException {
        if (errorReport == null) {
            return Arguments.createMap();
        }
        WritableMap errorReportMap = Arguments.createMap();
        errorReportMap.putString("id", errorReport.getId());
        errorReportMap.putString("threadName", errorReport.getThreadName());
        errorReportMap.putString("appErrorTime", "" + errorReport.getAppErrorTime().getTime());
        errorReportMap.putString("appStartTime", "" + errorReport.getAppStartTime().getTime());
        String stackTrace = errorReport.getStackTrace();
        if (stackTrace != null) {
            errorReportMap.putString("exception", stackTrace);
        }
        
        /* Convert device info. */
        Device deviceInfo = errorReport.getDevice();
        WritableMap deviceInfoMap;
        if (deviceInfo != null) {
            JSONStringer jsonStringer = new JSONStringer();
            jsonStringer.object();
            deviceInfo.write(jsonStringer);
            jsonStringer.endObject();
            JSONObject deviceInfoJson = new JSONObject(jsonStringer.toString());
            deviceInfoMap = RNUtils.convertJsonObjectToWritableMap(deviceInfoJson);
        } else {

            /* TODO investigate why this can be null. */
            deviceInfoMap = Arguments.createMap();
        }
        errorReportMap.putMap("device", deviceInfoMap);
        return errorReportMap;
    }

    private static WritableArray convertErrorReportsToWritableArray(Collection<ErrorReport> errorReports) throws JSONException {
        WritableArray errorReportsArray = Arguments.createArray();

        for (ErrorReport report : errorReports) {
            errorReportsArray.pushMap(convertErrorReportToWritableMap(report));
        }

        return errorReportsArray;
    }

    static WritableArray convertErrorReportsToWritableArrayOrEmpty(Collection<ErrorReport> errorReports) {
        try {
            return convertErrorReportsToWritableArray(errorReports);
        } catch (JSONException e) {
            logError("Unable to serialize crash reports");
            logError(Log.getStackTraceString(e));
            return Arguments.createArray();
        }
    }

    static WritableMap convertErrorReportToWritableMapOrEmpty(ErrorReport errorReport) {
        try {
            return convertErrorReportToWritableMap(errorReport);
        } catch (JSONException e) {
            logError("Unable to serialize crash report");
            logError(Log.getStackTraceString(e));
            return Arguments.createMap();
        }
    }

    static Collection<ErrorAttachmentLog> toCustomErrorAttachments(ReadableArray attachments) {
        Collection<ErrorAttachmentLog> attachmentLogs = new LinkedList<>();
        try {
            for (int i = 0; i < attachments.size(); i++) {
                ReadableMap jsAttachment = attachments.getMap(i);
                String fileName = null;
                if (jsAttachment.hasKey(FILE_NAME_FIELD)) {
                    fileName = jsAttachment.getString(FILE_NAME_FIELD);
                }
                if (jsAttachment.hasKey(TEXT_FIELD)) {
                    String text = jsAttachment.getString(TEXT_FIELD);
                    attachmentLogs.add(ErrorAttachmentLog.attachmentWithText(text, fileName));
                } else {
                    String encodedData = jsAttachment.getString(DATA_FIELD);
                    byte[] data = Base64.decode(encodedData, Base64.DEFAULT);
                    String contentType = jsAttachment.getString(CONTENT_TYPE_FIELD);
                    attachmentLogs.add(ErrorAttachmentLog.attachmentWithBinary(data, fileName, contentType));
                }
            }
        } catch (java.lang.Exception e) {
            AppCenterReactNativeCrashesUtils.logError("Failed to get error attachment for report: " + attachments);
            AppCenterReactNativeCrashesUtils.logError(Log.getStackTraceString(e));
        }
        return attachmentLogs;
    }

    static Exception toExceptionModel(ReadableMap readableMap)
               throws java.lang.Exception {
        Exception model = new Exception();
        try {
            String type = readableMap.getString("type");
            String message = readableMap.getString("message");
            String wrapperSdkName = readableMap.getString("wrapperSdkName");
            if (type == null || type == "") {
                throw new java.lang.Exception("Type value shouldn't be null ot empty");
            }
            if (message == null || message == "") {
                throw new java.lang.Exception("Message value shouldn't be null or empty");
            }
            if (wrapperSdkName == null || wrapperSdkName == "") {
                throw new java.lang.Exception("wrapperSdkName value shouldn't be null or empty");
            }
            model.setWrapperSdkName(wrapperSdkName);
            model.setType(type);
            model.setMessage(message);
            model.setStackTrace(readableMap.getString("stackTrace"));
        } catch (java.lang.Exception e) {
            AppCenterReactNativeCrashesUtils.logError("Failed to get exception model");
            AppCenterReactNativeCrashesUtils.logError(Log.getStackTraceString(e));
        }
        return model;
    }

    static Map<String, String> convertReadableMapToStringMap(ReadableMap map) throws JSONException {
        Map<String, String> stringMap = new HashMap<>();
        ReadableMapKeySetIterator it = map.keySetIterator();
        while (it.hasNextKey()) {
            String key = it.nextKey();
            ReadableType type = map.getType(key);
            
            // Only support storing strings. Non-string data must be stringified in JS.
            if (type == ReadableType.String) {
                stringMap.put(key, map.getString(key));
            }
        }

        return stringMap;
    }
}
