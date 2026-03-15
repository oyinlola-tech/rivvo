import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { api } from "../lib/api";
import {
  fingerprintPublicKey,
  generateKeyPair,
  getDeviceId,
  getOrCreateDeviceKeyPair,
  saveDeviceKeyPair,
} from "../lib/crypto";

interface DeviceEntry {
  deviceId: string;
  deviceName?: string | null;
  verifiedAt?: string | null;
  createdAt?: string;
}

export default function DeviceKeys() {
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [verifyPayload, setVerifyPayload] = useState<string>("");
  const deviceId = useMemo(() => getDeviceId(), []);

  const loadDevices = async () => {
    const response = await api.listDevices();
    if (response.success && response.data) {
      setDevices(response.data);
    }
  };

  const buildQr = async () => {
    const keyPair = await getOrCreateDeviceKeyPair();
    const fingerprint = await fingerprintPublicKey(keyPair.publicKey);
    setDeviceFingerprint(fingerprint);
    const payload = JSON.stringify({
      deviceId,
      fingerprint,
      publicKey: keyPair.publicKey,
    });
    const url = await QRCode.toDataURL(payload);
    setQrDataUrl(url);
  };

  useEffect(() => {
    loadDevices();
    buildQr();
  }, []);

  const rotateKey = async () => {
    const newPair = await generateKeyPair();
    saveDeviceKeyPair(newPair);
    await api.registerDeviceKey({
      deviceId,
      publicKey: JSON.stringify(newPair.publicKey),
      deviceName: navigator.userAgent,
    });
    await buildQr();
    await loadDevices();
  };

  const verifyFromPayload = async () => {
    try {
      const parsed = JSON.parse(verifyPayload);
      if (!parsed?.deviceId) return;
      await api.verifyDevice(parsed.deviceId);
      await loadDevices();
    } catch {
      // ignore invalid payload
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#111b21] md:ml-64">
      <div className="bg-[#111b21] sticky top-0 z-10 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Device Verification</h1>
      </div>

      <div className="bg-background rounded-t-[40px] min-h-[calc(100dvh-100px)] pt-6 px-6 pb-10">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#111b21]">This device</h2>
          <p className="text-sm text-[#667781]">Device ID: {deviceId}</p>
          <p className="text-sm text-[#667781] break-all">
            Fingerprint: {deviceFingerprint || "Generating..."}
          </p>
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="Device verification QR"
              className="mt-4 w-44 h-44"
            />
          )}
          <div className="mt-4">
            <button
              onClick={rotateKey}
              className="px-4 py-2 rounded-lg bg-[#1a8c7a] text-white"
            >
              Rotate Device Key
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#111b21]">Verify a device</h2>
          <p className="text-sm text-[#667781] mb-3">
            Paste the QR payload from the device you want to verify.
          </p>
          <textarea
            value={verifyPayload}
            onChange={(e) => setVerifyPayload(e.target.value)}
            className="w-full border rounded-lg p-3 text-sm"
            rows={4}
          />
          <button
            onClick={verifyFromPayload}
            className="mt-3 px-4 py-2 rounded-lg bg-[#111b21] text-white"
          >
            Verify Device
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#111b21]">Known devices</h2>
          <div className="mt-4 space-y-3">
            {devices.map((device) => (
              <div
                key={device.deviceId}
                className="border rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-[#111b21]">
                    {device.deviceName || "Unknown device"}
                  </p>
                  <p className="text-xs text-[#667781]">ID: {device.deviceId}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    device.verifiedAt ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {device.verifiedAt ? "Verified" : "Unverified"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}




