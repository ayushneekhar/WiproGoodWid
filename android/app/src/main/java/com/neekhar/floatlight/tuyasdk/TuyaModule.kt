package com.neekhar.floatlight.tuyasdk

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.thingclips.smart.android.user.api.ILoginCallback
import com.thingclips.smart.android.user.api.IRegisterCallback
import com.thingclips.smart.android.user.bean.User
import com.thingclips.smart.home.sdk.ThingHomeSdk
import com.thingclips.smart.sdk.api.IResultCallback

class TuyaModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "TuyaModule"

    private val countryCode = "91"

    /**
     * Helper function to send events from Native to JavaScript.
     */
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Register using email.
     * Exposed to React Native as a method that returns a Promise.
     */
    @ReactMethod
    fun registerUsingEmail(email: String, password: String, code: String, promise: Promise) {
        ThingHomeSdk.getUserInstance()
            .registerAccountWithEmail(countryCode, email, password, code, object : IRegisterCallback {
                override fun onSuccess(user: User) {
                    val userMap = Arguments.createMap().apply {
                        putString("username", user.username)
                        putString("userId", user.uid)
                    }
                    promise.resolve(userMap)
                }

                override fun onError(code: String, error: String) {
                    promise.reject(code, error)
                }
            })
    }

    /**
     * Login with phone number and password.
     * Exposed to React Native as a method that returns a Promise.
     */
    @ReactMethod
    fun loginWithPhone(phoneNumber: String, password: String, promise: Promise) {
        ThingHomeSdk.getUserInstance().loginWithPhonePassword(
            countryCode, phoneNumber, password,
            object : ILoginCallback {
                override fun onSuccess(user: User) {
                    val userMap = Arguments.createMap().apply {
                        putString("username", user.username)
                        putString("userId", user.uid)
                        // Add any other user properties you need
                    }
                    promise.resolve(userMap)
                }

                override fun onError(code: String, error: String) {
                    promise.reject(code, error)
                }
            })
    }


    /**
     * Login with email and password.
     * Exposed to React Native as a method that returns a Promise.
     */
    @ReactMethod
    fun loginWithEmail(email: String, password: String, promise: Promise) {
        ThingHomeSdk.getUserInstance()
            .loginWithEmail(countryCode, email, password, object : ILoginCallback {
                override fun onSuccess(user: User) {
                    val userMap = Arguments.createMap().apply {
                        putString("username", user.username)
                        putString("userId", user.uid)
                    }
                    promise.resolve(userMap)
                }

                override fun onError(code: String, error: String) {
                    promise.reject(code, error)
                }
            })
    }

    /**
     * Send verification code to email.
     * Exposed to React Native as a method that returns a Promise.
     */
    @ReactMethod
    fun sendVerificationCodeToEmail(email: String, isRegister: Boolean, promise: Promise) {
        ThingHomeSdk.getUserInstance()
            .sendVerifyCodeWithUserName(email, "", countryCode, if (isRegister) 1 else 2, object : IResultCallback {
                override fun onSuccess() {
                    promise.resolve(null)
                }

                override fun onError(code: String, error: String) {
                    promise.reject(code, error)
                }
            })
    }

    /**
     * Verify email code.
     * Exposed to React Native as a method that returns a Promise.
     */
    @ReactMethod
    fun verifyEmailCode(email: String, code: String, promise: Promise) {
        ThingHomeSdk.getUserInstance()
            .loginWithEmailCode(countryCode, email, code, object : ILoginCallback {
                override fun onSuccess(user: User) {
                    val userMap = Arguments.createMap().apply {
                        putString("username", user.username)
                        putString("userId", user.uid)
                    }
                    promise.resolve(userMap)
                }

                override fun onError(code: String, error: String) {
                    promise.reject(code, error)
                }
            })
    }
}