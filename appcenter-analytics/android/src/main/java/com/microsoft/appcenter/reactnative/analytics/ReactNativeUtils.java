// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.appcenter.reactnative.analytics;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class ReactNativeUtils {
    public static JSONObject convertReadableMapToJsonObject(ReadableMap map) throws JSONException {
        JSONObject jsonObj = new JSONObject();
        ReadableMapKeySetIterator it = map.keySetIterator();
        while (it.hasNextKey()) {
            String key = it.nextKey();
            ReadableType type = map.getType(key);
            switch (type) {
                case Map:
                    jsonObj.put(key, convertReadableMapToJsonObject(map.getMap(key)));
                    break;
                case Array:
                    jsonObj.put(key, convertReadableArrayToJsonArray(map.getArray(key)));
                    break;
                case String:
                    jsonObj.put(key, map.getString(key));
                    break;
                case Number:
                    Double number = map.getDouble(key);
                    if ((number == Math.floor(number)) && !Double.isInfinite(number)) {
                        jsonObj.put(key, number.longValue());
                    } else {
                        jsonObj.put(key, number.doubleValue());
                    }

                    break;
                case Boolean:
                    jsonObj.put(key, map.getBoolean(key));
                    break;
                default:
                    jsonObj.put(key, null);
                    break;
            }
        }

        return jsonObj;
    }

    public static JSONArray convertReadableArrayToJsonArray(ReadableArray arr) throws JSONException {
        JSONArray jsonArr = new JSONArray();
        for (int i=0; i<arr.size(); i++) {
            ReadableType type = arr.getType(i);
            switch (type) {
                case Map:
                    jsonArr.put(convertReadableMapToJsonObject(arr.getMap(i)));
                    break;
                case Array:
                    jsonArr.put(convertReadableArrayToJsonArray(arr.getArray(i)));
                    break;
                case String:
                    jsonArr.put(arr.getString(i));
                    break;
                case Number:
                    Double number = arr.getDouble(i);
                    if ((number == Math.floor(number)) && !Double.isInfinite(number)) {
                        jsonArr.put(number.longValue());
                    } else {
                        jsonArr.put(number.doubleValue());
                    }

                    break;
                case Boolean:
                    jsonArr.put(arr.getBoolean(i));
                    break;
                case Null:
                    jsonArr.put(null);
                    break;
            }
        }

        return jsonArr;
    }

    public static Map<String, String> convertReadableMapToStringMap(ReadableMap map) throws JSONException {
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
