"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounced } from "../table-helpers";
import { useClickOutside } from "./account-menu";
import { SearchIcon } from "./icons";
import s from "./shell.module.css";
import { useShell } from "./shell-context";
import { api } from "@/lib/api";
import type { SearchHit } from "@/lib/types";

const GROUPS: { kind: SearchHit["kind"]; label: string }[] = [
  { kind: "page", label: "Features" },
  { kind: "hosted_zone", label: "Hosted zones" },
  { kind: "record", label: "Records" },
  { kind: "health_check", label: "Health checks" },
];

export default function GlobalSearch() {
  const router = useRouter();
  const { searchInput } = useShell();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  useClickOutside(wrap, () => setOpen(false), open);

  const q = useDebounced(text.trim(), 200);
  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => api.search(q),
    enabled: q.length > 0,
    staleTime: 5_000,
  });

  const ordered = useMemo(
    () => GROUPS.flatMap((g) => (data ?? []).filter((h) => h.kind === g.kind)),
    [data],
  );
  useEffect(() => setActive(0), [data]);

  const go = (hit: SearchHit) => {
    setOpen(false);
    setText("");
    searchInput.current?.blur();
    router.push(hit.href);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, ordered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && ordered[active]) {
      go(ordered[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      searchInput.current?.blur();
    }
  };

  let index = -1;
  return (
    <div className={s.searchWrap} ref={wrap}>
      <div className={s.searchBox}>
        <SearchIcon />
        <input
          ref={searchInput}
          value={text}
          placeholder="Search"
          aria-label="Search for features, hosted zones, records and health checks"
          role="combobox"
          aria-controls="global-search-results"
          aria-expanded={open && q.length > 0}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
        />
        <span className={s.kbd}>[Alt+S]</span>
      </div>
      {open && q.length > 0 && (
        <div id="global-search-results" className={s.panel} style={{ left: 0, right: 0, maxHeight: 420, overflowY: "auto" }} role="listbox">
          {ordered.length === 0 ? (
            <div className={s.searchHit} style={{ cursor: "default" }}>
              {isFetching ? "Searching…" : `No results for "${q}"`}
            </div>
          ) : (
            GROUPS.map((g) => {
              const hits = ordered.filter((h) => h.kind === g.kind);
              if (!hits.length) return null;
              return (
                <div key={g.kind}>
                  <div className={s.searchGroup}>{g.label}</div>
                  {hits.map((h) => {
                    index += 1;
                    const i = index;
                    return (
                      <div
                        key={h.href + h.title}
                        role="option"
                        aria-selected={i === active}
                        className={`${s.searchHit} ${i === active ? s.searchHitActive : ""}`}
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          go(h);
                        }}
                      >
                        {h.title}
                        <small>{h.subtitle}</small>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
