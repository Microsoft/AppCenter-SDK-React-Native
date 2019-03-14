const rnpmlink = require('appcenter-link-scripts');

// Configure Android first.
let promise = null;
if (rnpmlink.android.checkIfAndroidDirectoryExists()) {
    console.log('Configuring AppCenter Analytics for Android');
    rnpmlink.android.removeAndroidDuplicateLinks();
}
promise = Promise.resolve();

// Then iOS even if Android failed.
if (rnpmlink.ios.checkIfAppDelegateExists()) {
    promise
        .then(() => {
            const code =
                '  [AppCenterReactNativeAnalytics registerWithInitiallyEnabled:true];  // Initialize AppCenter analytics';
            return rnpmlink.ios.initInAppDelegate('#import <AppCenterReactNativeAnalytics/AppCenterReactNativeAnalytics.h>', code, /.*\[AppCenterReactNativeAnalytics register.*/g);
        })
        .then((file) => {
            console.log(`Added code to initialize iOS Analytics SDK in ${file}`);
            return rnpmlink.ios.addPodDeps(
                [
                    { pod: 'AppCenter/Analytics', version: '1.13.2' },
                    { pod: 'AppCenterReactNativeShared', version: '1.12.2' } // in case people don't link appcenter (core)
                ],
                { platform: 'ios', version: '9.0' }
            );
        })
        .catch((e) => {
            console.error(`Could not configure AppCenter Analytics for iOS. Error Reason - ${e.message}`);
            return Promise.resolve();
        });
}
return promise;
