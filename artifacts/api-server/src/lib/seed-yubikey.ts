import { db, yubikeyDevicesTable, yubikeyAuthEventsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function seedYubikey() {
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(yubikeyDevicesTable);
  if ((count?.count ?? 0) > 0) return;

  console.log("Seeding YubiKey data...");
  await db.insert(yubikeyDevicesTable).values([
    { serialNumber: "YK5-18294731", model: "YubiKey 5 NFC", firmwareVersion: "5.4.3", assignedUser: "admin@corp.com", status: "active", authSuccessCount: 847, authFailCount: 3, protocols: "FIDO2,U2F,OTP,PIV", department: "IT" },
    { serialNumber: "YK5-28371642", model: "YubiKey 5C", firmwareVersion: "5.4.3", assignedUser: "ceo@corp.com", status: "active", authSuccessCount: 412, authFailCount: 1, protocols: "FIDO2,U2F,OTP", department: "Executive" },
    { serialNumber: "YK5-39182734", model: "YubiKey 5 NFC", firmwareVersion: "5.4.3", assignedUser: "finance@corp.com", status: "active", authSuccessCount: 623, authFailCount: 8, protocols: "FIDO2,U2F,OTP,PIV", department: "Finance" },
    { serialNumber: "YK5-47283916", model: "YubiKey 5Ci", firmwareVersion: "5.4.3", assignedUser: "dev@corp.com", status: "active", authSuccessCount: 1205, authFailCount: 2, protocols: "FIDO2,U2F,OTP", department: "Engineering" },
    { serialNumber: "YK5-51928374", model: "YubiKey 5 NFC", firmwareVersion: "5.2.7", assignedUser: "hr@corp.com", status: "suspended", authSuccessCount: 298, authFailCount: 15, protocols: "FIDO2,U2F,OTP", department: "HR" },
    { serialNumber: "YK5-62837461", model: "YubiKey Bio", firmwareVersion: "5.6.1", assignedUser: "devops@corp.com", status: "active", authSuccessCount: 956, authFailCount: 0, protocols: "FIDO2,U2F", department: "Engineering" },
    { serialNumber: "YK5-73928415", model: "YubiKey 5 NFC", firmwareVersion: "5.4.3", assignedUser: null, status: "unassigned", authSuccessCount: 0, authFailCount: 0, protocols: "FIDO2,U2F,OTP,PIV", department: null },
    { serialNumber: "YK5-84019273", model: "YubiKey 5C Nano", firmwareVersion: "5.4.3", assignedUser: "dba@corp.com", status: "active", authSuccessCount: 534, authFailCount: 5, protocols: "FIDO2,U2F,OTP", department: "Engineering" },
  ]);

  await db.insert(yubikeyAuthEventsTable).values([
    { deviceSerial: "YK5-18294731", user: "admin@corp.com", eventType: "auth_success", protocol: "FIDO2", ipAddress: "10.0.1.10", location: "HQ - Floor 3" },
    { deviceSerial: "YK5-51928374", user: "hr@corp.com", eventType: "auth_failure", protocol: "FIDO2", ipAddress: "89.44.33.22", location: "Unknown - Nigeria" },
    { deviceSerial: "YK5-51928374", user: "hr@corp.com", eventType: "auth_failure", protocol: "U2F", ipAddress: "89.44.33.22", location: "Unknown - Nigeria" },
    { deviceSerial: "YK5-51928374", user: "hr@corp.com", eventType: "auth_failure", protocol: "FIDO2", ipAddress: "185.220.101.34", location: "Unknown - Russia" },
    { deviceSerial: "YK5-28371642", user: "ceo@corp.com", eventType: "auth_success", protocol: "FIDO2", ipAddress: "10.0.3.5", location: "Remote - NYC" },
    { deviceSerial: "YK5-39182734", user: "finance@corp.com", eventType: "auth_success", protocol: "OTP", ipAddress: "10.0.1.15", location: "HQ - Floor 2" },
    { deviceSerial: "YK5-47283916", user: "dev@corp.com", eventType: "auth_success", protocol: "FIDO2", ipAddress: "10.0.2.22", location: "Remote - Portland" },
    { deviceSerial: "YK5-62837461", user: "devops@corp.com", eventType: "auth_success", protocol: "FIDO2", ipAddress: "10.0.10.5", location: "AWS Console" },
    { deviceSerial: "YK5-84019273", user: "dba@corp.com", eventType: "auth_failure", protocol: "OTP", ipAddress: "10.0.10.10", location: "AWS us-east-1" },
    { deviceSerial: "YK5-18294731", user: "admin@corp.com", eventType: "key_enrolled", protocol: "FIDO2", ipAddress: "10.0.1.10", location: "HQ - Floor 3" },
  ]);
  console.log("YubiKey data seeded.");
}
