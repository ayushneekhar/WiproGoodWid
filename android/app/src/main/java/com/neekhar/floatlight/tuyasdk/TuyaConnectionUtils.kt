package com.neekhar.floatlight.tuyasdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.thingclips.smart.home.sdk.ThingHomeSdk
import com.thingclips.smart.home.sdk.builder.ActivatorBuilder
import com.thingclips.smart.home.sdk.builder.ThingDirectlyDeviceActivatorBuilder
import com.thingclips.smart.sdk.api.IThingActivator
import com.thingclips.smart.sdk.api.IThingActivatorGetToken
import com.thingclips.smart.sdk.api.IThingSmartActivatorListener
import com.thingclips.smart.sdk.bean.DeviceBean
import com.thingclips.smart.sdk.enums.ActivatorModelEnum

class TuyaDevicePairingManager(private val reactContext: ReactApplicationContext) {

    private var mThingActivator: IThingActivator? = null

    /**
     * Helper function to send events from Native to JavaScript.
     */
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Starts the EZ Mode (Smart Config) pairing process.
     * This will listen for devices broadcasting their presence.
     */
    fun startEzLinkPairing(
        homeId: Long,
        wifiSsid: String,
        wifiPassword: String,
        promise: Promise
    ) {
        ThingHomeSdk.getActivatorInstance()
            .getActivatorToken(homeId, object : IThingActivatorGetToken {
                override fun onSuccess(token: String) {
                    val builder = ActivatorBuilder()
                        .setContext(reactContext)
                        .setSsid(wifiSsid)
                        .setPassword(wifiPassword)
                        .setActivatorModel(ActivatorModelEnum.THING_EZ)
                        .setTimeOut(100)
                        .setToken(token)
                        .setListener(object : IThingSmartActivatorListener {
                            override fun onStep(step: String, data: Any?) {
                                val params = Arguments.createMap().apply {
                                    putString("step", step)
                                }
                                sendEvent("onPairingStep", params)
                            }

                            override fun onActiveSuccess(devBean: DeviceBean) {
                                val params = Arguments.createMap().apply {
                                    putString("devId", devBean.devId)
                                    putString("name", devBean.name)
                                }
                                sendEvent("onPairingSuccess", params)
                            }

                            override fun onError(errorCode: String, errorMsg: String) {
                                val params = Arguments.createMap().apply {
                                    putString("code", errorCode)
                                    putString("message", errorMsg)
                                }
                                sendEvent("onPairingError", params)
                                // Clean up the activator
                                mThingActivator?.stop()
                                mThingActivator = null
                            }
                        })

                    mThingActivator = ThingHomeSdk.getActivatorInstance().newMultiActivator(builder)
                    // Step 3: Start the activation process.
                    mThingActivator?.start()
                    promise.resolve("Pairing process started.")
                }

                override fun onFailure(errorCode: String, errorMsg: String) {
                    promise.reject(errorCode, "Failed to get activation token: $errorMsg")
                }
            })
    }

    /**
     * Stops any ongoing pairing process.
     */
    fun stopPairing(promise: Promise) {
        if (mThingActivator != null) {
            mThingActivator?.stop()
            mThingActivator = null
            promise.resolve("Pairing stopped successfully.")
        } else {
            promise.reject("NO_PROCESS", "No pairing process is currently active.")
        }
    }

    // You can add other pairing methods here (AP Mode, Bluetooth, etc.)
}