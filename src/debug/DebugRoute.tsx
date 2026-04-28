import { Redirect } from "expo-router";
import React from "react";

import { DebugContent } from "./DebugContent";

export default function DebugScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DebugContent />;
}
