import { getErrorMessage } from "../../utils/error-message";

export { getErrorMessage } from "../../utils/error-message";

export function isPermissionError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "NotAllowedError") return true;
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("not-allowed") || message.includes("permission");
}

export function isAlreadyStartedError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes("already started") ||
    message.includes("already starting") ||
    message.includes("recognition has already started")
  );
}

export const getActionError = (error: unknown, permissionMessage: string, prefix: string): string =>
  isPermissionError(error) ? permissionMessage : `${prefix}: ${getErrorMessage(error)}`;

