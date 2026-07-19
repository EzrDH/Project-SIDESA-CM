package id.desa.cibeteungmuara.sidesa_app

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec

/// Hardware-backed, biometric-gated ECDSA P-384 signing via Android Keystore.
/// Signatures are re-encoded to the compact 96-byte low-S wire format expected
/// by @sidesa/crypto, so a hardware key is interchangeable with the software one.
class MainActivity : FlutterFragmentActivity() {
    private val channelName = "sidesa/keystore"
    // P-384 group order n.
    private val nP384 = BigInteger("39402006196394479212279040100143613805079739270465446667946905279627659399113263569398956308152294913554433653942643")

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName).setMethodCallHandler { call, result ->
            try {
                when (call.method) {
                    "isAvailable" -> result.success(isBiometricAvailable())
                    "generateKey" -> result.success(generateKey(call.argument<String>("alias")!!))
                    "getPublicKey" -> result.success(compressedPubHex(call.argument<String>("alias")!!))
                    "sign" -> sign(
                        call.argument<String>("alias")!!,
                        call.argument<String>("messageHex")!!,
                        call.argument<String>("reason") ?: "Verifikasi untuk menandatangani",
                        result,
                    )
                    else -> result.notImplemented()
                }
            } catch (e: Exception) {
                result.error("KEYSTORE_ERR", e.message, null)
            }
        }
    }

    private fun isBiometricAvailable(): Boolean =
        BiometricManager.from(this).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS

    private fun buildSpec(alias: String, strongBox: Boolean): KeyGenParameterSpec {
        val b = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN)
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp384r1"))
            .setDigests(KeyProperties.DIGEST_SHA384)
            .setUserAuthenticationRequired(true)
        if (Build.VERSION.SDK_INT >= 30) {
            b.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
        } else {
            @Suppress("DEPRECATION")
            b.setUserAuthenticationValidityDurationSeconds(-1) // per-operation auth
        }
        if (strongBox && Build.VERSION.SDK_INT >= 28) b.setIsStrongBoxBacked(true)
        return b.build()
    }

    private fun generateKey(alias: String): String {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (ks.containsAlias(alias)) return compressedPubHex(alias) // reuse the persistent key
        val kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
        try {
            kpg.initialize(buildSpec(alias, strongBox = true))
            kpg.generateKeyPair()
        } catch (e: Exception) {
            // No StrongBox HSM (e.g. emulator) → fall back to the TEE.
            kpg.initialize(buildSpec(alias, strongBox = false))
            kpg.generateKeyPair()
        }
        return compressedPubHex(alias)
    }

    private fun compressedPubHex(alias: String): String {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val pub = ks.getCertificate(alias).publicKey as ECPublicKey
        val x = to48(pub.w.affineX)
        val prefix = if (pub.w.affineY.testBit(0)) 0x03 else 0x02
        return byteToHex(byteArrayOf(prefix.toByte()) + x)
    }

    private fun sign(alias: String, messageHex: String, reason: String, result: MethodChannel.Result) {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val entry = ks.getEntry(alias, null) as KeyStore.PrivateKeyEntry
        val signature = Signature.getInstance("SHA384withECDSA").apply { initSign(entry.privateKey) }

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(r: BiometricPrompt.AuthenticationResult) {
                try {
                    val s = r.cryptoObject!!.signature!!
                    s.update(hexToBytes(messageHex))
                    result.success(derToCompactLowS(s.sign()))
                } catch (e: Exception) {
                    result.error("SIGN_ERR", e.message, null)
                }
            }
            override fun onAuthenticationError(code: Int, msg: CharSequence) {
                result.error("AUTH_ERR", "$code: $msg", null)
            }
        }

        runOnUiThread {
            val prompt = BiometricPrompt(this, ContextCompat.getMainExecutor(this), callback)
            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle("SIDESA Desa Cibeteung Muara")
                .setSubtitle(reason)
                .setNegativeButtonText("Batal")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .build()
            prompt.authenticate(info, BiometricPrompt.CryptoObject(signature))
        }
    }

    // --- encoding helpers (must match @sidesa/crypto wire format) ---

    private fun to48(v: BigInteger): ByteArray {
        val out = ByteArray(48)
        val b = v.toByteArray() // big-endian, possibly with a leading 0x00 sign byte
        val src = if (b.size > 48) b.copyOfRange(b.size - 48, b.size) else b
        System.arraycopy(src, 0, out, 48 - src.size, src.size)
        return out
    }

    private fun derToCompactLowS(der: ByteArray): String {
        // DER: 0x30 total 0x02 rLen r 0x02 sLen s
        var i = 2
        require(der[0].toInt() == 0x30 && der[i].toInt() == 0x02)
        val rLen = der[i + 1].toInt()
        val r = BigInteger(1, der.copyOfRange(i + 2, i + 2 + rLen))
        i += 2 + rLen
        require(der[i].toInt() == 0x02)
        val sLen = der[i + 1].toInt()
        var s = BigInteger(1, der.copyOfRange(i + 2, i + 2 + sLen))
        if (s > nP384.shiftRight(1)) s = nP384.subtract(s) // enforce low-S
        return byteToHex(to48(r) + to48(s))
    }

    private fun hexToBytes(hex: String): ByteArray {
        val out = ByteArray(hex.length / 2)
        for (i in out.indices) out[i] = hex.substring(i * 2, i * 2 + 2).toInt(16).toByte()
        return out
    }

    private fun byteToHex(b: ByteArray): String = b.joinToString("") { "%02x".format(it) }
}
