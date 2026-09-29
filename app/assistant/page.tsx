//app\assistant\page.tsx

import { AppShell } from "@/components/layout/app-shell";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export default function AssistantPage() {
  return <AppShell><AssistantChat /></AppShell>;
}
