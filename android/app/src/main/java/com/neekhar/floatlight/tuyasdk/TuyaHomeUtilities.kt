package com.neekhar.floatlight.tuyasdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.thingclips.smart.home.sdk.ThingHomeSdk
import com.thingclips.smart.home.sdk.api.IThingHomeChangeListener
import com.thingclips.smart.home.sdk.api.IThingHomeStatusListener
import com.thingclips.smart.home.sdk.bean.HomeBean
import com.thingclips.smart.home.sdk.bean.WeatherBean
import com.thingclips.smart.home.sdk.bean.DeviceAndGroupInHomeBean
import com.thingclips.smart.home.sdk.callback.IThingGetHomeListCallback
import com.thingclips.smart.home.sdk.callback.IThingHomeResultCallback
import com.thingclips.smart.home.sdk.callback.IIGetHomeWetherSketchCallBack
import com.thingclips.smart.interior.enums.BizParentTypeEnum
import com.thingclips.smart.sdk.api.IResultCallback
import com.thingclips.smart.sdk.bean.DeviceBean
import com.thingclips.smart.sdk.bean.GroupBean

class TuyaHomeUtilities(private val reactContext: ReactApplicationContext): ReactContextBaseJavaModule(reactContext) {

    private var homeChangeListener: IThingHomeChangeListener? = null
    private val homeStatusListeners = mutableMapOf<Long, IThingHomeStatusListener>()

    override fun getName() = "TuyaHomeModule"

    /**
     * Creates a new home.
     * @param name The name of the home (up to 25 characters).
     * @param lon The longitude of the home.
     * @param lat The latitude of the home.
     * @param geoName The geographical location name of the home.
     * @param rooms A list of room names to be created in the home.
     * @param promise A promise that resolves with the new home's ID or rejects with an error.
     */
    @ReactMethod
    fun createHome(name: String, lon: Double, lat: Double, geoName: String, rooms: ReadableArray, promise: Promise) {
        val roomList = rooms.toArrayList().map { it.toString() }
        ThingHomeSdk.getHomeManagerInstance().createHome(name, lon, lat, geoName, roomList, object : IThingHomeResultCallback {
            override fun onSuccess(bean: HomeBean) {
                promise.resolve(bean.homeId.toDouble()) // JS numbers are doubles
            }

            override fun onError(errorCode: String, errorMsg: String) {
                promise.reject(errorCode, errorMsg)
            }
        })
    }

    /**
     * Queries the list of homes associated with the current user account.
     * @param promise A promise that resolves with an array of home objects or rejects with an error.
     */
    @ReactMethod
    fun queryHomeList(promise: Promise) {
        ThingHomeSdk.getHomeManagerInstance().queryHomeList(object : IThingGetHomeListCallback {
            override fun onSuccess(homeBeans: MutableList<HomeBean>?) {
                val homeBeansArray: WritableArray = Arguments.createArray()
                homeBeans?.forEach { bean ->
                    homeBeansArray.pushMap(convertHomeBeanToWritableMap(bean))
                }
                promise.resolve(homeBeansArray)
            }

            override fun onError(errorCode: String, errorMsg: String) {
                promise.reject(errorCode, errorMsg)
            }
        })
    }

    /**
     * Retrieves the detailed information for a specific home, including devices, groups, and rooms.
     * @param homeId The ID of the home to query.
     * @param promise A promise that resolves with the detailed home object or rejects with an error.
     */
    @ReactMethod
    fun getHomeDetail(homeId: Double, promise: Promise) {
        ThingHomeSdk.newHomeInstance(homeId.toLong()).getHomeDetail(object : IThingHomeResultCallback {
            override fun onSuccess(bean: HomeBean) {
                promise.resolve(convertHomeBeanToWritableMap(bean))
            }

            override fun onError(errorCode: String, errorMsg: String) {
                promise.reject(errorCode, errorMsg)
            }
        })
    }

    /**
     * Retrieves the detailed information for a specific home from the local cache.
     * @param homeId The ID of the home to query.
     * @param promise A promise that resolves with the cached detailed home object or rejects with an error.
     */
    @ReactMethod
    fun getHomeLocalCache(homeId: Double, promise: Promise) {
        ThingHomeSdk.newHomeInstance(homeId.toLong()).getHomeLocalCache(object : IThingHomeResultCallback {
            override fun onSuccess(bean: HomeBean) {
                promise.resolve(convertHomeBeanToWritableMap(bean))
            }

            override fun onError(errorCode: String, errorMsg: String) {
                // SDK cache errors are often not critical, but we reject for consistency.
                promise.reject(errorCode, errorMsg)
            }
        })
    }

    /**
     * Updates the information for a specific home.
     * @param homeId The ID of the home to update.
     * @param name The new name for the home.
     * @param lon The new longitude for the home.
     * @param lat The new latitude for the home.
     * @param geoName The new geographical name for the home.
     * @param rooms The new list of room names.
     * @param promise A promise that resolves on success or rejects with an error.
     */
    @ReactMethod
    fun updateHome(homeId: Double, name: String, lon: Double, lat: Double, geoName: String, rooms: ReadableArray, overwriteRooms: Boolean, promise: Promise) {
        val roomList = rooms.toArrayList().map { it.toString() }
        ThingHomeSdk.newHomeInstance(homeId.toLong()).updateHome(name, lon, lat, geoName, roomList, overwriteRooms, object : IResultCallback {
            override fun onSuccess() {
                promise.resolve(null)
            }

            override fun onError(code: String, error: String) {
                promise.reject(code, error)
            }
        })
    }

    /**
     * Dismisses a home, effectively deleting it. Only the home owner can perform this action.
     * @param homeId The ID of the home to dismiss.
     * @param promise A promise that resolves on success or rejects with an error.
     */
    @ReactMethod
    fun dismissHome(homeId: Double, promise: Promise) {
        ThingHomeSdk.newHomeInstance(homeId.toLong()).dismissHome(object : IResultCallback {
            override fun onSuccess() {
                promise.resolve(null)
            }

            override fun onError(code: String, error: String) {
                promise.reject(code, error)
            }
        })
    }

    /**
     * Queries the weather overview for the home's location.
     * @param homeId The ID of the home.
     * @param lon The longitude for the weather query.
     * @param lat The latitude for the weather query.
     * @param promise A promise that resolves with the weather sketch object or rejects with an error.
     */
    @ReactMethod
    fun getHomeWeatherSketch(homeId: Double, lon: Double, lat: Double, promise: Promise) {
        ThingHomeSdk.newHomeInstance(homeId.toLong()).getHomeWeatherSketch(lon, lat, object : IIGetHomeWetherSketchCallBack {
            override fun onSuccess(result: WeatherBean?) {
                if (result == null) {
                    promise.resolve(null)
                    return
                }
                val weatherMap = Arguments.createMap().apply {
                    putString("condition", result.condition)
                    putString("temp", result.temp)
                    putString("iconUrl", result.iconUrl)
                    putString("inIconUrl", result.inIconUrl)
                }
                promise.resolve(weatherMap)
            }

            override fun onFailure(errorCode: String, errorMsg: String) {
                promise.reject(errorCode, errorMsg)
            }
        })
    }

    /**
     * Sorts the devices and groups within a home.
     * @param homeId The ID of the home.
     * @param sortList An array of objects, each with 'bizId' (String) and 'bizType' (String: "DEVICE" or "GROUP").
     * @param promise A promise that resolves on success or rejects with an error.
     */
    @ReactMethod
    fun sortDevInHome(homeId: Double, sortList: ReadableArray, promise: Promise) {
        val deviceAndGroupList = mutableListOf<DeviceAndGroupInHomeBean>()
        for (i in 0 until sortList.size()) {
            val item = sortList.getMap(i)
            val bizId = item?.getString("bizId")
            val bizTypeStr = item?.getString("bizType")

            val bizTypeInt = when (bizTypeStr) {
                "DEVICE" -> BizParentTypeEnum.DEVICE.type
                "GROUP" -> BizParentTypeEnum.GROUP.type
                else -> -1 // Invalid type
            }

            if (bizId != null && bizTypeInt != -1) {
                val bean = DeviceAndGroupInHomeBean().apply {
                    this.bizId = bizId
                    this.bizType = bizTypeInt
                }
                deviceAndGroupList.add(bean)
            }
        }

        ThingHomeSdk.newHomeInstance(homeId.toLong()).sortDevInHome(homeId.toString(), deviceAndGroupList, object : IResultCallback {
            override fun onSuccess() {
                promise.resolve(null)
            }

            override fun onError(code: String, error: String) {
                promise.reject(code, error)
            }
        })
    }


    // --- Listener Methods ---

    /**
     * Registers a listener for global home information changes (added, removed, info changed, etc.).
     * Events are sent to JavaScript via the DeviceEventEmitter.
     * JS side should use: `new NativeEventEmitter(TuyaHomeUtilities).addListener('onHomeChange', callback);`
     * @param promise Resolves if the listener is registered, rejects if already registered.
     */
    @ReactMethod
    fun registerHomeChangeListener(promise: Promise) {
        if (homeChangeListener != null) {
            promise.reject("LISTENER_ALREADY_REGISTERED", "Home change listener is already registered.")
            return
        }
        homeChangeListener = object : IThingHomeChangeListener {
            private fun sendEvent(eventName: String, params: WritableMap?) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            }

            override fun onHomeAdded(homeId: Long) {
                val params = Arguments.createMap().apply { putDouble("homeId", homeId.toDouble()) }
                sendEvent("onHomeAdded", params)
            }

            override fun onHomeInvite(homeId: Long, homeName: String) {
                val params = Arguments.createMap().apply {
                    putDouble("homeId", homeId.toDouble())
                    putString("homeName", homeName)
                }
                sendEvent("onHomeInvite", params)
            }

            override fun onHomeRemoved(homeId: Long) {
                val params = Arguments.createMap().apply { putDouble("homeId", homeId.toDouble()) }
                sendEvent("onHomeRemoved", params)
            }

            override fun onHomeInfoChanged(homeId: Long) {
                val params = Arguments.createMap().apply { putDouble("homeId", homeId.toDouble()) }
                sendEvent("onHomeInfoChanged", params)
            }

            override fun onSharedDeviceList(sharedDeviceList: List<DeviceBean>) {
                 val deviceIds = Arguments.createArray().apply {
                    sharedDeviceList.forEach { pushString(it.devId) }
                }
                val params = Arguments.createMap().apply { putArray("deviceIds", deviceIds) }
                sendEvent("onSharedDeviceList", params)
            }

            override fun onSharedGroupList(sharedGroupList: List<GroupBean>) {
                val groupIds = Arguments.createArray().apply {
                    sharedGroupList.forEach { pushLong(it.id) }
                }
                val params = Arguments.createMap().apply { putArray("groupIds", groupIds) }
                sendEvent("onSharedGroupList", params)
            }

            override fun onServerConnectSuccess() {
                sendEvent("onServerConnectSuccess", null)
            }
        }
        ThingHomeSdk.getHomeManagerInstance().registerThingHomeChangeListener(homeChangeListener)
        promise.resolve(true)
    }

    /**
     * Unregisters the global home information change listener.
     * @param promise Resolves on success.
     */
    @ReactMethod
    fun unregisterHomeChangeListener(promise: Promise) {
        homeChangeListener?.let {
            ThingHomeSdk.getHomeManagerInstance().unRegisterThingHomeChangeListener(it)
            homeChangeListener = null
        }
        promise.resolve(true)
    }
    
    // Required for new NativeEventEmitter syntax
    @ReactMethod
    fun addListener(eventName: String) { /* Keep blank */ }

    @ReactMethod
    fun removeListeners(count: Int) { /* Keep blank */ }


    // --- Helper Functions ---

    /**
     * Converts a Tuya HomeBean object to a React Native WritableMap.
     * @param bean The HomeBean to convert.
     * @return A WritableMap representing the home.
     */
    private fun convertHomeBeanToWritableMap(bean: HomeBean): WritableMap {
        return Arguments.createMap().apply {
            putDouble("lat", bean.lat)
            putDouble("lon", bean.lon)
            putDouble("homeId", bean.homeId.toDouble()) // Use Double for JS compatibility
            putString("geoName", bean.geoName)
            putString("name", bean.name)
            putBoolean("admin", bean.isAdmin)
            putInt("homeStatus", bean.homeStatus)
            putInt("role", bean.role)

            // Convert rooms
            val roomsArray: WritableArray = Arguments.createArray()
            bean.rooms?.forEach { room ->
                val roomMap: WritableMap = Arguments.createMap().apply {
                    putString("name", room.name)
                    putDouble("roomId", room.roomId.toDouble())
                }
                roomsArray.pushMap(roomMap)
            }
            putArray("rooms", roomsArray)

            val devicesArray: WritableArray = Arguments.createArray()
            bean.deviceList?.forEach { device ->
                val deviceMap: WritableMap = Arguments.createMap().apply {
                    putString("devId", device.devId)
                    putString("name", device.name ?: "Unknown Device")
                    putString("mac", device.mac)
                    putBoolean("isOnline", device.isOnline)
                    putInt("accessType", device.accessType)
                    putString("dpName", device.dpName.toString())
                    putString("communicationId", device.communicationId)
                    putInt("connectionStatus", device.connectionStatus)
                    putString("iconUrl", device.iconUrl)
                    putString("productId", device.productId ?: "")

                    val dpsArray: WritableArray = Arguments.createArray()

                    device.dps.forEach { dp ->
                        val dpsMap: WritableMap = Arguments.createMap().apply {
                            putString(dp.key, dp.value.toString())
                        }
                        dpsArray.pushMap(dpsMap)
                    }

                    putArray("dpsArray", dpsArray)
                }
                devicesArray.pushMap(deviceMap)
            }
            putArray("devices", devicesArray)
            
            // Note: Converting deviceList, groupList, etc. would require
            // additional helper functions for DeviceBean, GroupBean, etc.
            // This can be expanded as needed.
        }
    }
}