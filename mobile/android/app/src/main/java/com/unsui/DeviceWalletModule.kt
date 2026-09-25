package com.unsui

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.ResultReceiver
import com.facebook.react.bridge.*
import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager
import java.util.UUID

/** Public ethOS WalletProxy, matching EthereumPhone/WalletSDK e774281fb23170e4461f2676c4540e7de73aa992.
 * Address, chain selection and personal_sign only. No transaction or private-key access. */
@SuppressLint("WrongConstant")
class DeviceWalletModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val handler = Handler(Looper.getMainLooper())
    private var cancelPending: (() -> Unit)? = null
    override fun getName() = "DeviceWallet"
    private fun service(): Any = reactApplicationContext.getSystemService("wallet")
        ?: throw IllegalStateException("No dGen1 system wallet")
    private fun invoke(proxy: Any, name: String, vararg args: Any): Any? =
        Class.forName("android.os.WalletProxy").methods.first {
            it.name == name && it.parameterCount == args.size
        }.invoke(proxy, *args)

    @ReactMethod fun isAvailable(promise: Promise) {
        try { service(); Class.forName("android.os.WalletProxy"); promise.resolve(true) }
        catch (_: Exception) { promise.resolve(false) }
    }
    @ReactMethod fun cancel(promise: Promise) {
        handler.post { cancelPending?.invoke(); promise.resolve(null) }
    }
    override fun invalidate() {
        handler.post { cancelPending?.invoke() }
        super.invalidate()
    }
    @ReactMethod fun connect(promise: Promise) = request("connect", 0, "", promise)
    @ReactMethod fun switchNetwork(chainId: Int, promise: Promise) = request("switch", chainId, "", promise)
    @ReactMethod fun signAddress(chainId: Int, expectedAddress: String, promise: Promise) =
        request("sign", chainId, expectedAddress, promise)

    private fun request(action: String, chainId: Int, expectedAddress: String, promise: Promise) {
        handler.post {
            if (cancelPending != null) { promise.reject("BUSY", "A dGen1 request is already open."); return@post }
            if (action != "connect" && chainId != 1 && chainId != 6497) {
                promise.reject("NETWORK", "Choose Ethereum or Mizuhiki Awaji."); return@post
            }
            var finished = false
            lateinit var timeout: Runnable
            fun finish() { finished = true; cancelPending = null; handler.removeCallbacks(timeout) }
            fun fail(code: String, message: String) {
                if (finished) return
                finish(); promise.reject(code, message)
            }
            timeout = Runnable { fail("TIMEOUT", "The dGen1 request timed out. Unlock the wallet and retry.") }
            cancelPending = { fail("CANCELLED", "Wallet request cancelled. You can enter an address manually.") }
            handler.postDelayed(timeout, 120000)
            try {
                val proxy = service()
                val session = invoke(proxy, "createSession") as String
                fun call(name: String, args: Array<Any>, next: (String) -> Unit) {
                    val receiver = object : ResultReceiver(handler) {
                        override fun onReceiveResult(resultCode: Int, resultData: Bundle?) {
                            if (finished) return
                            try {
                                val value = resultData?.getString("result")
                                if (value.isNullOrEmpty()) fail("DECLINED", "Wallet request declined or unavailable. You can retry or enter an address manually.")
                                else next(value)
                            } catch (_: Exception) { fail("RESPONSE", "The wallet returned an unsupported response. Try again.") }
                        }
                    }
                    try { invoke(proxy, name, *args, receiver) }
                    catch (_: Exception) { fail("UNAVAILABLE", "This dGen1 wallet operation is unavailable. Update or unlock the wallet, or use manual entry.") }
                }
                fun account(next: (String, Int) -> Unit) {
                    call("getAddress", arrayOf(session)) { address ->
                        if (!Regex("^0x[0-9a-fA-F]{40}$").matches(address) || Regex("^0x0+$").matches(address)) {
                            fail("ADDRESS", "Set up or unlock your dGen1 wallet, then try again.")
                        } else call("getChainId", arrayOf(session)) { raw ->
                            val actualChain = if (raw.startsWith("0x")) raw.substring(2).toIntOrNull(16) else raw.toIntOrNull()
                            if (actualChain == null || actualChain <= 0) fail("NETWORK", "The wallet did not return a valid network.")
                            else next(address, actualChain)
                        }
                    }
                }
                fun resolveAccount(address: String, actualChain: Int) {
                    if (finished) return
                    finish(); promise.resolve(Arguments.createMap().apply {
                        putString("address", address); putInt("chainId", actualChain)
                    })
                }
                if (action == "switch") {
                    call("changeChainId", arrayOf(session, chainId)) {
                        account { address, actualChain ->
                            if (actualChain != chainId) fail("NETWORK_MISMATCH", "The wallet did not switch networks. Select the requested network in your wallet or use manual entry.")
                            else resolveAccount(address, actualChain)
                        }
                    }
                } else account { address, actualChain ->
                    if (action == "connect") resolveAccount(address, actualChain)
                    else if (actualChain != chainId) fail("NETWORK_MISMATCH", "Switch your dGen1 wallet to the selected payout network, then reconnect.")
                    else if (!address.equals(expectedAddress, ignoreCase = true)) fail("ACCOUNT_CHANGED", "Your wallet account changed. Reconnect before signing.")
                    else {
                        val nonce = UUID.randomUUID().toString()
                        val issuedAt = java.time.Instant.now().toString()
                        val network = if (chainId == 1) "Ethereum (1)" else "Mizuhiki Awaji Testnet (6497)"
                        val message = "UnSui demo refund destination\n\nAddress: $address\nNetwork: $network\nRequest: $nonce\nIssued at: $issuedAt\n\nI choose this wallet as my demo refund destination. This message does not authorize a transaction, token approval or transfer. No funds will be sent."
                        call("signMessage", arrayOf(session, message, chainId.toString(), address, "personal_sign")) { signature ->
                            if (!Regex("^0x(?:[0-9a-fA-F]{2}){65,4096}$").matches(signature)) {
                                fail("SIGNATURE", "Signing was declined or the signature format is unsupported.")
                            } else account { afterAddress, afterChain ->
                                if (!afterAddress.equals(address, ignoreCase = true) || afterChain != chainId) {
                                    fail("ACCOUNT_CHANGED", "The wallet account or network changed while signing. Reconnect and retry.")
                                } else {
                                    finish(); promise.resolve(Arguments.createMap().apply {
                                        putString("address", address); putInt("chainId", chainId)
                                        putString("message", message); putString("signature", signature)
                                        putString("nonce", nonce); putString("issuedAt", issuedAt)
                                    })
                                }
                            }
                        }
                    }
                }
            } catch (_: Exception) { fail("UNAVAILABLE", "The dGen1 system wallet is unavailable. Use manual address entry.") }
        }
    }
}
class DeviceWalletPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(DeviceWalletModule(context))
    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
