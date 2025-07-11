package com.neekhar.floatlight.tuyasdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableNativeMap // To send structured data
import com.facebook.react.modules.core.DeviceEventManagerModule // For the event emitter
import org.json.JSONObject // For proper JSON conversion

import com.thingclips.smart.home.sdk.ThingHomeSdk
import com.thingclips.smart.sdk.api.IDeviceListener
import com.thingclips.smart.sdk.api.IResultCallback
import com.thingclips.smart.sdk.api.IThingDevice// The listener interface
import com.thingclips.smart.sdk.bean.DeviceBean

class TuyaDeviceControlUtilities(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext)  {
    override fun getName() = "TuyaDeviceControlModule"

    private var deviceInstance: IThingDevice? = null
    private var mDevId: String? = null

    // Helper function to convert MutableMap to JSON string manually
    private fun convertMapToJson(map: MutableMap<String, Any>?): String {
        if (map == null) return "{}"
        
        val sb = StringBuilder()
        sb.append("{")
        
        map.entries.forEachIndexed { index, entry ->
            if (index > 0) sb.append(",")
            
            // Add key
            sb.append("\"${entry.key}\":")
            
            // Add value with proper type handling
            when (val value = entry.value) {
                is String -> sb.append("\"$value\"")
                is Boolean -> sb.append(value)
                is Number -> sb.append(value)
                null -> sb.append("null")
                else -> sb.append("\"${value.toString()}\"")
            }
        }
        
        sb.append("}")
        return sb.toString()
    }

    // The listener that will be attached to the device
    private val deviceListener = object : IDeviceListener {
        // This is triggered when DP data changes
        override fun onDpUpdate(devId: String?, dpStr: MutableMap<String, Any>?) {
            val params = WritableNativeMap().apply {
                putString("devId", devId)
                // Convert MutableMap to proper JSON format
                val jsonStr = if (dpStr != null) {
                    try {
                        JSONObject(dpStr as Map<String, Any>).toString()
                    } catch (e: Exception) {
                        // Fallback to manual conversion if JSONObject fails
                        convertMapToJson(dpStr)
                    }
                } else {
                    "{}"
                }
                putString("dpStr", jsonStr)
            }
            sendEvent("onDpUpdate", params)
        }

        // This is triggered when the device is removed from the home
        override fun onRemoved(devId: String?) {
            val params = WritableNativeMap().apply { putString("devId", devId) }
            sendEvent("onDeviceRemoved", params)
        }

        // This is triggered when the device's online/offline status changes
        override fun onStatusChanged(devId: String?, online: Boolean) {
            val params = WritableNativeMap().apply {
                putString("devId", devId)
                putBoolean("online", online)
            }
            sendEvent("onDeviceStatusChanged", params)
        }

        // This is triggered when device info (like its name) is updated
        override fun onNetworkStatusChanged(devId: String?, status: Boolean) {
            // You can handle this if needed
        }

        override fun onDevInfoUpdate(devId: String?) {
            // You can handle this if needed
        }
    }

    // Helper to send events to React Native
    private fun sendEvent(eventName: String, params: WritableNativeMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun initializeDeviceControl(devId: String) {
        mDevId = devId
        deviceInstance = ThingHomeSdk.newDeviceInstance(devId)
    }

    // --- NEW: Lifecycle and Listener Functions ---
    @ReactMethod
    fun registerDpUpdateListener() {
        deviceInstance?.registerDeviceListener(deviceListener)
    }

    @ReactMethod
    fun unregisterDpUpdateListener() {
        deviceInstance?.unRegisterDevListener()
    }

    // --- NEW: Function to get current status ---
    @ReactMethod
    fun getDeviceStatus(promise: Promise) {
        if (mDevId == null) {
            promise.reject("E_NO_DEVICE", "Device not initialized. Call initializeDeviceControl first.")
            return
        }

        // CORRECT WAY to get the DeviceBean
        val deviceBean: DeviceBean? = ThingHomeSdk.getDataInstance().getDeviceBean(mDevId)

        if (deviceBean == null) {
            promise.reject("E_DEVICE_NOT_FOUND", "Device with ID $mDevId not found in the current home.")
            return
        }

        val statusMap = WritableNativeMap().apply {
            putBoolean("online", deviceBean.isOnline)
            // The dps is a Map<String, Any>, convert it to a writable map
            val dpsMap = WritableNativeMap()
            deviceBean.dps?.forEach { (dpId, value) ->
                when (value) {
                    is Boolean -> dpsMap.putBoolean(dpId, value)
                    is Int -> dpsMap.putInt(dpId, value)
                    is Double -> dpsMap.putDouble(dpId, value)
                    else -> dpsMap.putString(dpId, value.toString())
                }
            }
            putMap("dps", dpsMap)
        }
        promise.resolve(statusMap)
    }

    // --- Your Existing sendCommand function (now with better checking) ---
    @ReactMethod
    fun sendCommand(dps: String, promise: Promise) {
        if (deviceInstance == null || mDevId == null) {
            promise.reject("E_DEVICE_NOT_INITIALIZED", "Device not initialized.")
            return
        }

        // CORRECT WAY to check online status
        val isOnline = ThingHomeSdk.getDataInstance().getDeviceBean(mDevId)?.isOnline
        if (isOnline == false) {
            promise.reject("E_DEVICE_OFFLINE", "Device is offline.")
            return
        }

        deviceInstance?.publishDps(dps, object : IResultCallback {
            override fun onSuccess() {
                promise.resolve("Command sent successfully!")
            }

            override fun onError(code: String, error: String) {
                promise.reject(code, error)
            }
        })
    }

    @ReactMethod
    fun onDestroy() {
        deviceInstance?.unRegisterDevListener()
        deviceInstance = null
    }
}