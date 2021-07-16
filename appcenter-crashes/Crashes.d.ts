export enum UserConfirmation {
  DONT_SEND = 0,
  SEND = 1,
  ALWAYS_SEND = 2
}

export interface CrashesListener {
  onBeforeSending?: (report: ErrorReport) => void;
  onSendingSucceeded?: (report: ErrorReport) => void;
  onSendingFailed?: (report: ErrorReport) => void;
  getErrorAttachments?: (report: ErrorReport) => Promise<ErrorAttachmentLog[]>;
  shouldProcess?: (report: ErrorReport) => boolean;
  shouldAwaitUserConfirmation?: () => boolean;
}

export class ErrorAttachmentLog {
  public static attachmentWithText(text: string, fileName?: string): ErrorAttachmentLog;
  public static attachmentWithBinary(
    data: string,
    fileName: string | null,
    contentType: string
  ): ErrorAttachmentLog;
}

export class ExceptionModel {
  wrapperSdkName: string;
  innerException: ExceptionModel[];
  type: string;
  message: string;
  stacktrace: string;
}

export interface Device {
  sdkName: string;
  sdkVersion: string;
  model: string;
  oemName: string;
  osName: string;
  osVersion: string;
  osBuild: string;
  osApiLevel?: number;
  locale: string;
  timeZoneOffset: number;
  screenSize?: string;
  appVersion: string;
  carrierName?: string;
  carrierCountry?: string;
  appBuild: string;
  appNamespace: string;
}

export interface ErrorReport {
  id: string;
  threadName?: string;
  appErrorTime: string | number;
  appStartTime: string | number;
  exception?: string;
  exceptionReason?: string;
  device: Device;
  signal?: string;
  appProcessIdentifier?: number;
}

export function generateTestCrash(): Promise<void>;
export function hasCrashedInLastSession(): Promise<boolean>;
export function hasReceivedMemoryWarningInLastSession(): Promise<boolean>;
export function lastSessionCrashReport(): Promise<ErrorReport>;
export function isEnabled(): Promise<boolean>;
export function setEnabled(shouldEnable: boolean): Promise<void>;
export function trackError(
  error: ExceptionModel, 
  properties?: { [name: string]: string },
  attachments?: ErrorAttachmentLog[]
): void;
export function notifyUserConfirmation(userConfirmation: UserConfirmation): void;
export function setListener(crashesListener: CrashesListener): Promise<void>;
