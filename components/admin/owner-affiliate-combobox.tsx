"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

type OwnerOption = {
  id: string;
  name: string;
  email: string | null;
  telegramUsername: string | null;
  affiliateCode: string | null;
};

type OwnerAffiliateComboboxProps = {
  owners: OwnerOption[];
  defaultValue?: string;
};

function buildOwnerLabel(owner: OwnerOption) {
  return `${owner.name} · ${owner.affiliateCode ?? "tanpa kode"} · ${
    owner.email ??
    (owner.telegramUsername ? `@${owner.telegramUsername}` : "telegram")
  }`;
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function getOwnerSearchText(owner: OwnerOption) {
  return normalizeSearchText(
    [
      owner.name,
      owner.email,
      owner.telegramUsername,
      owner.affiliateCode,
      buildOwnerLabel(owner),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function OwnerAffiliateCombobox({
  owners,
  defaultValue,
}: OwnerAffiliateComboboxProps) {
  const selectedOwner = owners.find((owner) => owner.id === defaultValue) ?? null;
  const [selectedId, setSelectedId] = useState(defaultValue ?? "");
  const [query, setQuery] = useState(
    selectedOwner ? buildOwnerLabel(selectedOwner) : "",
  );
  const [isOpen, setIsOpen] = useState(false);

  const filteredOwners = useMemo(() => {
    const needle = normalizeSearchText(query);

    if (!needle) {
      return owners.slice(0, 40);
    }

    return owners
      .filter((owner) => getOwnerSearchText(owner).includes(needle))
      .slice(0, 40);
  }, [owners, query]);

  function selectOwner(owner: OwnerOption) {
    setSelectedId(owner.id);
    setQuery(buildOwnerLabel(owner));
    setIsOpen(false);
  }

  function clearSelection() {
    setSelectedId("");
    setQuery("");
    setIsOpen(true);
  }

  return (
    <label className="relative grid gap-2 text-sm font-medium text-white">
      Owner affiliate
      <input type="hidden" name="ownerUserId" value={selectedId} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/38" />
        <input
          type="search"
          value={query}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onChange={(event) => {
            const nextQuery = event.currentTarget.value;
            setQuery(nextQuery);

            const currentSelectedOwner =
              owners.find((owner) => owner.id === selectedId) ?? null;
            const selectedLabel = currentSelectedOwner
              ? buildOwnerLabel(currentSelectedOwner)
              : "";

            if (nextQuery !== selectedLabel) {
              setSelectedId("");
            }

            setIsOpen(true);
          }}
          placeholder="Cari nama, email, username, atau kode affiliate"
          autoComplete="off"
          className="h-12 w-full rounded-2xl border border-white/10 bg-[rgb(31,21,20)] px-11 pr-11 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/50"
        />
        {query ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSelection}
            className="absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-white/42 transition hover:bg-white/10 hover:text-white"
            aria-label="Bersihkan pilihan owner"
          >
            <X className="size-4" />
          </button>
        ) : null}

        {isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-40 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#2b252c] p-1 shadow-[0_22px_70px_rgba(0,0,0,0.45)]">
            {filteredOwners.length > 0 ? (
              filteredOwners.map((owner) => {
                const isSelected = owner.id === selectedId;

                return (
                  <button
                    key={owner.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOwner(owner)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                      isSelected
                        ? "bg-accent text-white"
                        : "text-white/72 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {owner.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-white/58">
                        {owner.affiliateCode ?? "tanpa kode"} ·{" "}
                        {owner.email ??
                          (owner.telegramUsername
                            ? `@${owner.telegramUsername}`
                            : "telegram")}
                      </span>
                    </span>
                    {isSelected ? <Check className="size-4 shrink-0" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-white/48">
                Owner tidak ditemukan.
              </div>
            )}
          </div>
        ) : null}
      </div>

      <span className="text-xs font-normal text-[var(--muted)]">
        Ketik lalu pilih owner dari hasil pencarian.
      </span>
    </label>
  );
}
