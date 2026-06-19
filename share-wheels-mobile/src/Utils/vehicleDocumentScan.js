import AsyncStorage from "@react-native-async-storage/async-storage";
import { scanVehicleDocumentApi } from "../ApiService/ridesApiServices";
import {
  verifyDrivingLicenseScan,
  verifyRcScan,
} from "./vehicleDocumentOcr";

const mapDocumentField = (documentType) =>
  documentType === "license" ? "license" : "rc";

/**
 * Scan vehicle document — backend Google Vision first (especially for RC),
 * then on-device ML Kit as fallback.
 */
export const scanVehicleDocument = async (documentType, imageAsset, vehicleTypes = []) => {
  const kind = mapDocumentField(documentType);
  const token = await AsyncStorage.getItem("token");

  if (token) {
    try {
      const backend = await scanVehicleDocumentApi(token, kind, imageAsset);
      if (backend?.code !== "OCR_NOT_CONFIGURED") {
        return backend;
      }
    } catch (err) {
      if (__DEV__) {
        console.warn("[OCR] backend scan failed, using on-device:", err?.message);
      }
    }
  }

  if (kind === "license") {
    return verifyDrivingLicenseScan(imageAsset);
  }
  return verifyRcScan(imageAsset, vehicleTypes);
};
