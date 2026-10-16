package com.inventoryapp.app;

import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "BiometricPlugin")
public class BiometricPlugin extends Plugin {

    @PluginMethod
    public void isAvailable(PluginCall call) {
        try {
            BiometricManager biometricManager = BiometricManager.from(getContext());
            // Support both Biometric and Device Credential (PIN / Pattern / Password)
            int canAuth = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL
            );

            JSObject ret = new JSObject();
            if (canAuth == BiometricManager.BIOMETRIC_SUCCESS) {
                ret.put("isAvailable", true);
                ret.put("hasBiometrics", true);
                ret.put("deviceLockAvailable", true);
                ret.put("status", "AVAILABLE");
            } else {
                // Check if device credential only is available
                int credOnly = biometricManager.canAuthenticate(BiometricManager.Authenticators.DEVICE_CREDENTIAL);
                if (credOnly == BiometricManager.BIOMETRIC_SUCCESS) {
                    ret.put("isAvailable", true);
                    ret.put("hasBiometrics", false);
                    ret.put("deviceLockAvailable", true);
                    ret.put("status", "DEVICE_CREDENTIAL_ONLY");
                } else {
                    ret.put("isAvailable", false);
                    ret.put("hasBiometrics", false);
                    ret.put("deviceLockAvailable", false);
                    ret.put("status", "NOT_AVAILABLE");
                }
            }
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("isAvailable", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void authenticate(final PluginCall call) {
        final FragmentActivity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not found");
            return;
        }

        final String title = call.getString("title", "Unlock Inventory App");
        final String subtitle = call.getString("subtitle", "Confirm your fingerprint, face, or phone lock to proceed");

        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                try {
                    Executor executor = ContextCompat.getMainExecutor(activity);

                    BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                                super.onAuthenticationError(errorCode, errString);
                                JSObject ret = new JSObject();
                                ret.put("success", false);
                                ret.put("errorCode", errorCode);
                                ret.put("errorMessage", errString.toString());
                                call.resolve(ret);
                            }

                            @Override
                            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                                super.onAuthenticationSucceeded(result);
                                JSObject ret = new JSObject();
                                ret.put("success", true);
                                call.resolve(ret);
                            }

                            @Override
                            public void onAuthenticationFailed() {
                                super.onAuthenticationFailed();
                                // Individual attempt failed; user can re-try until max attempts
                            }
                        });

                    BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setAllowedAuthenticators(
                            BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL
                        )
                        .build();

                    biometricPrompt.authenticate(promptInfo);
                } catch (Exception e) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", e.getMessage());
                    call.resolve(ret);
                }
            }
        });
    }
}
