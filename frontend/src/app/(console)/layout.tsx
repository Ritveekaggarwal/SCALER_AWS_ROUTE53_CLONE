import ConsoleFooter from "@/components/shell/footer";
import { ShellProvider } from "@/components/shell/shell-context";
import { KeyboardShortcuts, ShortcutsModal } from "@/components/shell/shortcuts";
import TopBar from "@/components/shell/top-bar";

export default function ConsoleGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <TopBar />
      {children}
      <ConsoleFooter />
      <KeyboardShortcuts />
      <ShortcutsModal />
    </ShellProvider>
  );
}
