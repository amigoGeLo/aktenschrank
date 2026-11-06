// Wird per esbuild zu www/native.js gebündelt und stellt der Web-App die nativen Funktionen bereit.
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
window.AktenNative = { BiometricAuth };
