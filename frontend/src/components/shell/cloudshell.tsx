"use client";

import Button from "@cloudscape-design/components/button";
import { useEffect, useRef, useState } from "react";
import { CloudShellIcon } from "./icons";
import s from "./shell.module.css";
import { useShell } from "./shell-context";
import { api, ApiError } from "@/lib/api";
import { useMe, useRefreshAll } from "@/lib/hooks";

interface Line {
  kind: "in" | "out" | "err" | "info";
  text: string;
}

const WELCOME: Line[] = [
  { kind: "info", text: "Preparing your terminal..." },
  { kind: "info", text: "Try these commands to get started:\n  aws route53 list-hosted-zones\n  aws route53 help\n" },
];

const MIN_HEIGHT = 160;

export default function CloudShell() {
  const { cloudShellOpen, setCloudShellOpen } = useShell();
  const { data: user } = useMe();
  const refreshAll = useRefreshAll();
  const [lines, setLines] = useState<Line[]>(WELCOME);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState<number | null>(null);
  const [height, setHeight] = useState(300);
  const [maximized, setMaximized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const prompt = `[cloudshell-user@${user?.account_alias ?? "aws"} ~]$ `;

  useEffect(() => {
    if (cloudShellOpen) setTimeout(() => inputRef.current?.focus(), 0);
  }, [cloudShellOpen]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines, busy]);

  if (!cloudShellOpen) return null;

  const run = async (cmd: string) => {
    const trimmed = cmd.trim();
    setLines((l) => [...l, { kind: "in", text: prompt + cmd }]);
    setInput("");
    setHistIndex(null);
    if (!trimmed) return;
    setHistory((h) => [...h.filter((x) => x !== trimmed), trimmed].slice(-100));
    if (trimmed === "clear") {
      setLines([]);
      return;
    }
    if (trimmed === "exit") {
      setCloudShellOpen(false);
      return;
    }
    if (trimmed === "history") {
      setLines((l) => [...l, { kind: "out", text: history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n") }]);
      return;
    }
    setBusy(true);
    try {
      const res = await api.cli(trimmed);
      if (res.output) setLines((l) => [...l, { kind: res.exit_code === 0 ? "out" : "err", text: res.output }]);
      if (res.exit_code === 0 && /\s(create|delete|change|update)-/.test(" " + trimmed)) refreshAll();
    } catch (e) {
      setLines((l) => [...l, { kind: "err", text: e instanceof ApiError ? e.message : "Connection lost. Try again." }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !busy) {
      run(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const i = histIndex === null ? history.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(i);
      setInput(history[i]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIndex === null) return;
      const i = histIndex + 1;
      if (i >= history.length) {
        setHistIndex(null);
        setInput("");
      } else {
        setHistIndex(i);
        setInput(history[i]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === "c" && e.ctrlKey && !window.getSelection()?.toString()) {
      e.preventDefault();
      setLines((l) => [...l, { kind: "in", text: prompt + input + "^C" }]);
      setInput("");
    }
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;
    const move = (ev: MouseEvent) =>
      setHeight(Math.min(window.innerHeight - 140, Math.max(MIN_HEIGHT, startH + (startY - ev.clientY))));
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const panelHeight = maximized ? "calc(100vh - 120px)" : height;

  return (
    <section className={s.shell} style={{ height: panelHeight }} aria-label="CloudShell">
      <div className={s.resizeHandle} onMouseDown={startResize} role="separator" aria-label="Resize CloudShell" />
      <div className={s.shellHeader}>
        <CloudShellIcon size={16} />
        <strong>CloudShell</strong>
        <span className={s.shellTab}>global</span>
        <div style={{ flex: 1 }} />
        <Button variant="icon" iconName="remove" ariaLabel="Clear" onClick={() => setLines([])} />
        <Button
          variant="icon"
          iconName={maximized ? "shrink" : "expand"}
          ariaLabel={maximized ? "Restore" : "Maximize"}
          onClick={() => setMaximized(!maximized)}
        />
        <Button variant="icon" iconName="close" ariaLabel="Close CloudShell" onClick={() => setCloudShellOpen(false)} />
      </div>
      <div className={s.shellBody} ref={bodyRef} onClick={() => inputRef.current?.focus()}>
        {lines.map((l, i) => (
          <div key={i} className={l.kind === "err" ? s.shellError : undefined}>
            {l.kind === "in" ? (
              <>
                <span className={s.shellPrompt}>{l.text.slice(0, prompt.length)}</span>
                {l.text.slice(prompt.length)}
              </>
            ) : (
              l.text
            )}
          </div>
        ))}
        {busy ? (
          <div>…</div>
        ) : (
          <div className={s.shellInputRow}>
            <span className={s.shellPrompt}>{prompt}</span>
            <input
              ref={inputRef}
              className={s.shellInput}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              spellCheck={false}
              autoComplete="off"
              aria-label="CloudShell command"
            />
          </div>
        )}
      </div>
    </section>
  );
}
