import Foundation
import NetworkExtension
import SystemConfiguration.CaptiveNetwork

@objc(TuyaPairingModule)
class TuyaPairingUtilities: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func getCurrentWiFiSSID(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // For iOS 14+, we need to request permission to access WiFi SSID
    // For now, we'll return null as this requires additional setup
    // In a production app, you would need to:
    // 1. Add network usage description to Info.plist
    // 2. Request network permissions
    // 3. Use NEHotspotNetwork.fetchCurrent() for iOS 14+
    
    if #available(iOS 14.0, *) {
      // iOS 14+ requires special permissions and setup
      resolve(nil)
    } else {
      // iOS 13 and below - attempt to get SSID using legacy method
      var ssid: String?
      if let interfaces = CNCopySupportedInterfaces() as NSArray? {
        for interface in interfaces {
          if let interfaceInfo = CNCopyCurrentNetworkInfo(interface as! CFString) as NSDictionary? {
            ssid = interfaceInfo[kCNNetworkInfoKeySSID as String] as? String
            break
          }
        }
      }
      resolve(ssid)
    }
  }
  
  // Placeholder methods for other pairing functionality
  // These would need to be implemented with the actual iOS Tuya SDK
  
  @objc
  func getEzPairingToken(_ homeId: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "iOS implementation not available yet", nil)
  }
  
  @objc
  func startEzPairing(_ params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "iOS implementation not available yet", nil)
  }
  
  @objc
  func stopEzPairing(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "iOS implementation not available yet", nil)
  }
  
  @objc
  func startLeScan(_ timeout: NSNumber) {
    // iOS BLE scanning implementation would go here
  }
  
  @objc
  func manuallyStopScanning(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(true)
  }
  
  @objc
  func getDeviceInfo(_ productId: String, uuid: String, mac: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "iOS implementation not available yet", nil)
  }
  
  @objc
  func startBleDevicePairing(_ params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "iOS implementation not available yet", nil)
  }
  
  @objc
  func stopBleDevicePairing(_ uuid: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(false)
  }
  
  @objc
  func startComboDevicePairing(_ params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "iOS implementation not available yet", nil)
  }
  
  @objc
  func stopComboDevicePairing(_ uuid: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(false)
  }
} 