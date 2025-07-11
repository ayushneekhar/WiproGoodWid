package com.neekhar.floatlight.tuyasdk

import android.content.Context
import android.net.wifi.WifiManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.thingclips.smart.android.ble.api.LeScanSetting
import com.thingclips.smart.android.ble.api.ScanType
import com.thingclips.smart.android.common.utils.WiFiUtil
import com.thingclips.smart.home.sdk.ThingHomeSdk
import com.thingclips.smart.home.sdk.bean.ConfigProductInfoBean
import com.thingclips.smart.home.sdk.builder.ActivatorBuilder
import com.thingclips.smart.sdk.api.IBleActivatorListener
import com.thingclips.smart.sdk.api.IMultiModeActivatorListener
import com.thingclips.smart.sdk.api.IThingActivator
import com.thingclips.smart.sdk.api.IThingActivatorGetToken
import com.thingclips.smart.sdk.api.IThingDataCallback
import com.thingclips.smart.sdk.api.IThingSmartActivatorListener
import com.thingclips.smart.sdk.bean.BleActivatorBean
import com.thingclips.smart.sdk.bean.DeviceBean
import com.thingclips.smart.sdk.bean.MultiModeActivatorBean
import com.thingclips.smart.sdk.enums.ActivatorModelEnum


class TuyaPairingUtilities(private val reactContext: ReactApplicationContext): ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "TuyaPairingModule"

    private val wifiManager = reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    private var ezActivator: IThingActivator? = null

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Converts a Tuya DeviceBean into a React Native WritableMap.
     */
    private fun convertDeviceBeanToWritableMap(deviceBean: DeviceBean?): WritableMap? {
        if (deviceBean == null) return null
        val map = Arguments.createMap()
        map.putString("devId", deviceBean.devId)
        map.putString("name", deviceBean.name)
        map.putString("iconUrl", deviceBean.iconUrl)
        map.putString("productId", deviceBean.productId)
        map.putString("uuid", deviceBean.uuid)
        map.putBoolean("isOnline", deviceBean.isOnline)
        // Add more properties from DeviceBean as needed
        return map
    }



    /**
     * JSDoc for JS:
     *
     * Gets the current WiFi network SSID that the device is connected to.
     * @returns {Promise<string>} A promise that resolves with the current WiFi SSID or null if not connected to WiFi.
     */
    @ReactMethod
    fun getCurrentWiFiSSID(promise: Promise) {
        try {
            val wifiInfo = wifiManager.connectionInfo
            if (wifiInfo != null && wifiInfo.networkId != -1) {
                var ssid = wifiInfo.ssid
                // Remove quotes from SSID if present
                if (ssid != null && ssid.startsWith("\"") && ssid.endsWith("\"")) {
                    ssid = ssid.substring(1, ssid.length - 1)
                }
                promise.resolve(ssid)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("WIFI_ERROR", "Failed to get current WiFi SSID: " + e.message, e)
        }
    }

    /**
     * JSDoc for JS:
     *
     * Gets a pairing token required for Wi-Fi based pairing (EZ and AP modes).
     * The token is valid for 10 minutes.
     * @param {number} homeId The ID of the home where the device will be added.
     * @returns {Promise<string>} A promise that resolves with the pairing token.
     */
    @ReactMethod
    fun getEzPairingToken(homeId: Double, promise: Promise) {
        ThingHomeSdk.getActivatorInstance().getActivatorToken(homeId.toLong(),
            object : IThingActivatorGetToken {
                override fun onSuccess(token: String?) {
                    promise.resolve(token)
                }

                override fun onFailure(errorCode: String, errorMsg: String?) {
                    promise.reject(errorCode, errorMsg)
                }
            })
    }

    /**
     * JSDoc for JS:
     *
     * Starts Wi-Fi EZ Mode (SmartConfig) pairing. The device must be in pairing mode (usually fast blinking).
     * Listen for the 'onEzPairingStep' event for progress updates.
     * @param {object} params Pairing parameters.
     * @param {string} params.token The pairing token obtained from `getEzPairingToken`.
     * @param {string} params.ssid The SSID of the 2.4GHz Wi-Fi network.
     * @param {string} params.password The password for the Wi-Fi network.
     * @param {number} [params.timeout=120] The pairing timeout in seconds.
     * @returns {Promise<Object>} A promise that resolves with the paired device's information or rejects with an error.
     */
    @ReactMethod
    fun startEzPairing(params: ReadableMap, promise: Promise) {
        val token = params.getString("token")
        val ssid = params.getString("ssid")
        val password = params.getString("password")
        val timeout = if (params.hasKey("timeout")) params.getInt("timeout").toLong() else 120L // Seconds

        val activatorListener = object : IThingSmartActivatorListener {
            override fun onStep(step: String?, data: Any?) {
                // Send progress steps back to React Native
                val eventParams = Arguments.createMap()
                eventParams.putString("step", step)
                // You could try to parse 'data' here if needed, but it can be complex.
                // For now, just sending the step name is very useful.
                sendEvent("onEzPairingStep", eventParams)
            }

            override fun onActiveSuccess(devResp: DeviceBean?) {
                promise.resolve(convertDeviceBeanToWritableMap(devResp))
                // Clean up the activator after success
                ezActivator?.stop()
                ezActivator?.onDestroy()
                ezActivator = null
            }

            override fun onError(errorCode: String, errorMsg: String?) {
                promise.reject(errorCode, errorMsg)
                // Clean up the activator after error
                ezActivator?.stop()
                ezActivator?.onDestroy()
                ezActivator = null
            }
        }

        val builder = ActivatorBuilder()
            .setSsid(ssid)
            .setContext(reactContext.applicationContext)
            .setPassword(password)
            .setActivatorModel(ActivatorModelEnum.THING_EZ)
            .setTimeOut(timeout)
            .setToken(token)
            .setListener(activatorListener)

        // Stop any previous activator just in case
        ezActivator?.stop()
        ezActivator?.onDestroy()

        ezActivator = ThingHomeSdk.getActivatorInstance().newMultiActivator(builder)
        ezActivator?.start()
    }

    /**
     * JSDoc for JS:
     *
     * Stops an ongoing Wi-Fi EZ Mode pairing process and cleans up resources.
     * @returns {Promise<boolean>} A promise that resolves to true if the stop command was issued.
     */
    @ReactMethod
    fun stopEzPairing(promise: Promise) {
        try {
            if (ezActivator != null) {
                ezActivator?.stop()
                ezActivator?.onDestroy()
                ezActivator = null
                promise.resolve(true)
            } else {
                // No activator was running, but the intention to stop is fulfilled.
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop EZ pairing: " + e.message, e)
        }
    }

    /**
     * JSDoc for JS:
     *
     * Starts scanning for nearby Tuya Bluetooth LE devices.
     * Listen for the 'onLeScan' event to receive discovered device updates.
     * @param {number} timeout The duration of the scan in milliseconds.
     */
    @ReactMethod
    fun startLeScan(timeout: Int) {
        val scanSetting = LeScanSetting.Builder().apply {
            setTimeout(timeout.toLong())
            addScanType(ScanType.SINGLE) // Scans for Bluetooth LE devices
        }.build()

        ThingHomeSdk.getBleOperator().startLeScan(scanSetting
        ) { bean ->
            val payload: WritableMap = Arguments.createMap()
            payload.putString("id", bean.id)
            payload.putString("name", bean.name)
            payload.putString("mac", bean.mac)
            payload.putInt("rssi", bean.rssi)
            payload.putString("address", bean.address)
            payload.putString("uuid", bean.uuid)
            payload.putInt("deviceType", bean.deviceType)
            payload.putString("productId", bean.productId)
            // *** ADDED for more context ***
            payload.putString("configType", bean.configType) // 'config_type_single' or 'config_type_wifi'
            payload.putBoolean("isBind", bean.isbind)
            payload.putInt("flag", bean.flag) // Bit flags for device capabilities

            sendEvent("onLeScan", payload)
        }
    }

    /**
     * JSDoc for JS:
     *
     * Fetches detailed product information (name, icon) for a discovered device
     * before it has been paired.
     * @param {string} productId The product ID from the scan result.
     * @param {string} uuid The UUID from the scan result.
     * @param {string} mac The MAC address from the scan result.
     * @returns {Promise<Object>} A promise that resolves with the device info.
     */
    @ReactMethod
    fun getDeviceInfo(productId: String, uuid: String, mac: String, promise: Promise) {
        ThingHomeSdk.getActivatorInstance().getActivatorDeviceInfo(productId, uuid, mac, object : IThingDataCallback<ConfigProductInfoBean> {
            override fun onSuccess(result: ConfigProductInfoBean) {
                val writableMap: WritableMap = Arguments.createMap()

                writableMap.putString("name", result.name)
                writableMap.putString("icon", result.icon)
                writableMap.putString("productId", result.productId)

                promise.resolve(writableMap)
            }

            override fun onError(errorCode: String, errorMessage: String?) {
                promise.reject(errorCode, errorMessage)
            }
        })
    }

    /**
     * JSDoc for JS:
     *
     * Manually stops the Bluetooth LE device scan.
     */
    @ReactMethod
    fun manuallyStopScanning() {
        ThingHomeSdk.getBleOperator().stopLeScan()
    }

    // --- NEWLY IMPLEMENTED FUNCTIONS ---

    /**
     * JSDoc for JS:
     *
     * Starts pairing a single Bluetooth LE device (where configType is 'config_type_single').
     * @param {object} params Pairing parameters.
     * @param {number} params.homeId The ID of the home to add the device to.
     * @param {string} params.uuid The UUID of the device from the scan result.
     * @param {number} params.deviceType The type of the device from the scan result.
     * @param {string} [params.productId] The product ID from the scan result.
     * @param {string} [params.address] The device IP address from the scan result.
     * @param {boolean} [params.isShare] Whether the device is a shared device. Calculated from scan 'flag'.
     * @param {number} [params.timeout=100000] The pairing timeout in milliseconds.
     * @returns {Promise<Object>} A promise that resolves with the paired device's information or rejects with an error.
     */
    @ReactMethod
    fun startBleDevicePairing(params: ReadableMap, promise: Promise) {
        val bleActivatorBean = BleActivatorBean().apply {
            homeId = params.getDouble("homeId").toLong()
            uuid = params.getString("uuid")
            deviceType = params.getInt("deviceType")
            if (params.hasKey("productId")) productId = params.getString("productId")
            if (params.hasKey("address")) address = params.getString("address")
            if (params.hasKey("isShare")) isShare = params.getBoolean("isShare")
            timeout = if (params.hasKey("timeout")) params.getInt("timeout").toLong() else 100000L
        }

        ThingHomeSdk.getActivator().newBleActivator().startActivator(bleActivatorBean, object : IBleActivatorListener {
            override fun onSuccess(deviceBean: DeviceBean?) {
                promise.resolve(convertDeviceBeanToWritableMap(deviceBean))
            }

            override fun onFailure(code: Int, msg: String?, handle: Any?) {
                promise.reject(code.toString(), msg)
            }
        })
    }

    /**
     * JSDoc for JS:
     *
     * Stops an ongoing Bluetooth LE device pairing process.
     * @param {string} uuid The UUID of the device for which to stop pairing.
     * @returns {Promise<boolean>} A promise that resolves when the stop command is issued.
     */
    @ReactMethod
    fun stopBleDevicePairing(uuid: String, promise: Promise) {
        try {
            ThingHomeSdk.getActivator().newBleActivator().stopActivator(uuid)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop BLE pairing: " + e.message, e)
        }
    }

    /**
     * JSDoc for JS:
     *
     * Starts pairing for a combo (Wi-Fi + Bluetooth) device (where configType is 'config_type_wifi').
     * @param {object} params Pairing parameters.
     * @param {number} params.homeId The ID of the home.
     * @param {string} params.uuid The device UUID from scan.
     * @param {number} params.deviceType The device type from scan.
     * @param {string} params.token The pairing token obtained for the home.
     * @param {string} params.ssid The SSID of the target 2.4GHz Wi-Fi network.
     * @param {string} params.password The password for the target Wi-Fi network.
     * @param {string} [params.mac] The device MAC address from scan.
     * @param {string} [params.address] The device IP address from scan.
     * @param {number} [params.timeout=120000] The pairing timeout in milliseconds.
     * @returns {Promise<Object>} A promise that resolves with the paired device's information or rejects with an error.
     */
    @ReactMethod
    fun startComboDevicePairing(params: ReadableMap, promise: Promise) {
        val multiModeBean = MultiModeActivatorBean().apply {
            homeId = params.getDouble("homeId").toLong()
            uuid = params.getString("uuid")
            deviceType = params.getInt("deviceType")
            token = params.getString("token")
            ssid = params.getString("ssid")
            pwd = params.getString("password")
            if (params.hasKey("mac")) mac = params.getString("mac")
            if (params.hasKey("address")) address = params.getString("address")
            timeout = if (params.hasKey("timeout")) params.getInt("timeout").toLong() else 120000L
        }

        ThingHomeSdk.getActivator().newMultiModeActivator().startActivator(multiModeBean, object : IMultiModeActivatorListener {
            override fun onSuccess(deviceBean: DeviceBean?) {
                promise.resolve(convertDeviceBeanToWritableMap(deviceBean))
            }

            override fun onFailure(code: Int, msg: String?, handle: Any?) {
                promise.reject(code.toString(), msg)
            }
        })
    }

    /**
     * JSDoc for JS:
     *
     * Stops an ongoing combo device pairing process.
     * @param {string} uuid The UUID of the device for which to stop pairing.
     * @returns {Promise<boolean>} A promise that resolves when the stop command is issued.
     */
    @ReactMethod
    fun stopComboDevicePairing(uuid: String, promise: Promise) {
        try {
            ThingHomeSdk.getActivator().newMultiModeActivator().stopActivator(uuid)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop combo pairing: " + e.message, e)
        }
    }
}