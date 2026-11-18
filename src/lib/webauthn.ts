function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  const base64 = window.btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * The backend returns the WebAuthn options either bare ({"challenge": ...})
 * or wrapped in {"publicKey": {...}} depending on the webauthn library
 * version. Accept both so a library upgrade cannot silently break biometrics.
 */
function unwrapOptions(options: any): any {
  return options?.publicKey ?? options ?? {};
}

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    !!window.PublicKeyCredential &&
    !!navigator.credentials
  );
}

export async function registerPasskey(options: any): Promise<any> {
  const publicKey: any = { ...unwrapOptions(options) };
  publicKey.challenge = base64urlToArrayBuffer(publicKey.challenge);
  publicKey.user.id = base64urlToArrayBuffer(publicKey.user.id);
  if (publicKey.excludeCredentials) {
    publicKey.excludeCredentials = publicKey.excludeCredentials.map((cred: any) => ({
      ...cred,
      id: base64urlToArrayBuffer(cred.id),
    }));
  }
  const credential: any = await navigator.credentials.create({ publicKey });
  return {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: arrayBufferToBase64url(credential.response.attestationObject),
      clientDataJSON: arrayBufferToBase64url(credential.response.clientDataJSON),
    },
  };
}

export async function authenticatePasskey(options: any): Promise<any> {
  const publicKey: any = { ...unwrapOptions(options) };
  publicKey.challenge = base64urlToArrayBuffer(publicKey.challenge);
  if (publicKey.allowCredentials) {
    publicKey.allowCredentials = publicKey.allowCredentials.map((cred: any) => ({
      ...cred,
      id: base64urlToArrayBuffer(cred.id),
    }));
  }
  const credential: any = await navigator.credentials.get({ publicKey });
  return {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: arrayBufferToBase64url(credential.response.authenticatorData),
      clientDataJSON: arrayBufferToBase64url(credential.response.clientDataJSON),
      signature: arrayBufferToBase64url(credential.response.signature),
      userHandle: credential.response.userHandle
        ? arrayBufferToBase64url(credential.response.userHandle)
        : null,
    },
  };
}
