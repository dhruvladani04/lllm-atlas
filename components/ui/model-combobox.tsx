"use client";

import { useId, useMemo, useRef, useState } from "react";
import { primaryCreator } from "@/lib/format/display-name";

/**
 * specs/04-design/design-system.md — choosing a model by typing.
 *
 * Replaces a native select of 377 alphabetised names, which on a phone is a wheel you
 * scroll for a minute. This follows the ARIA combobox pattern: a text input that owns a
 * listbox, arrow keys move the active option, Enter chooses it, Escape closes the list and
 * then clears the field. Options are grouped by creator, and at most `LIMIT` are rendered
 * at a time — the list is for finding a model, not for browsing all of them.
 */

export interface ComboboxModel {
  model_id: string;
  display_name: string;
  creator: string;
}

const LIMIT = 40;

export function ModelCombobox({
  models,
  value,
  onChange,
  label,
}: {
  models: readonly ComboboxModel[];
  value: string;
  onChange: (model_id: string) => void;
  label: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = models.find((model) => model.model_id === value) ?? null;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const hits = models.filter((model) =>
      needle === ""
        ? true
        : `${model.display_name} ${model.creator} ${model.model_id}`
            .toLowerCase()
            .includes(needle),
    );
    // Names that start with what was typed first, then the rest; alphabetical within each.
    return hits
      .sort(
        (a, b) =>
          Number(!a.display_name.toLowerCase().startsWith(needle)) -
            Number(!b.display_name.toLowerCase().startsWith(needle)) ||
          a.display_name.localeCompare(b.display_name),
      )
      .slice(0, LIMIT);
  }, [models, query]);

  // Grouped by creator for display; `matches` keeps the order the keyboard walks.
  const groups = useMemo(() => {
    const byCreator = new Map<string, ComboboxModel[]>();
    for (const model of matches) {
      const creator = primaryCreator(model.creator) || "Unknown";
      byCreator.set(creator, [...(byCreator.get(creator) ?? []), model]);
    }
    return [...byCreator.entries()];
  }, [matches]);
  const order = groups.flatMap(([, list]) => list);

  const choose = (model: ComboboxModel | undefined) => {
    if (model === undefined) return;
    onChange(model.model_id);
    setQuery("");
    setOpen(false);
  };

  const optionId = (index: number) => `${id}-option-${index}`;

  return (
    <div className="relative flex flex-col gap-1 text-sm">
      <label htmlFor={`${id}-input`} className="text-xs text-ink-mute">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={`${id}-input`}
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && order.length > 0 ? optionId(active) : undefined}
          autoComplete="off"
          placeholder={selected === null ? "Type a model name" : selected.display_name}
          value={open ? query : (selected?.display_name ?? "")}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(index + 1, order.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              if (open) {
                event.preventDefault();
                choose(order[active]);
              }
            } else if (event.key === "Escape") {
              if (open && query !== "") setQuery("");
              else setOpen(false);
            }
          }}
          className="w-56 rounded-sm border border-rule bg-surface px-2 py-1 max-sm:w-full"
        />
        {selected !== null ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="rounded-sm px-1.5 py-1 text-ink-mute hover:text-accent"
            aria-label={`Clear ${label}`}
          >
            ×
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-full left-0 z-20 mt-1 max-h-72 w-72 overflow-y-auto rounded-md border border-rule bg-surface py-1 shadow-md max-sm:w-full"
        >
          {order.length === 0 ? (
            <p className="px-3 py-2 text-ink-mute">No model matches.</p>
          ) : (
            groups.map(([creator, list]) => (
              <div key={creator} role="group" aria-label={creator}>
                <div aria-hidden="true" className="px-3 pt-2 pb-1 text-xs text-ink-mute">
                  {creator}
                </div>
                {list.map((model) => {
                  const index = order.indexOf(model);
                  return (
                    <div
                      key={model.model_id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === active}
                      // mousedown, not click: click fires after the input's blur has
                      // already closed the list.
                      onMouseDown={(event) => {
                        event.preventDefault();
                        choose(model);
                      }}
                      onMouseEnter={() => setActive(index)}
                      className={`cursor-pointer px-3 py-1 ${
                        index === active ? "bg-rule text-ink" : ""
                      }`}
                    >
                      {model.display_name}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
