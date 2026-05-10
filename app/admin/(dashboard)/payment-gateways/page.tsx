import { CreditCard, QrCode, ShieldCheck } from "lucide-react";

import {
  savePaymentGatewayConfigAction,
  setActivePaymentGatewayAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DUITKU_PRIMARY_CHANNELS,
  resolveDuitkuEnabledChannelCodes,
} from "@/lib/duitku";
import { listPaymentGatewayConfigs } from "@/lib/payment-gateways";
import {
  PAYMENKU_PRIMARY_CHANNELS,
  resolvePaymenkuEnabledChannelCodes,
} from "@/lib/paymenku";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPaymentGatewaysPage(
  props: PageProps<"/admin/payment-gateways">,
) {
  const searchParams = await props.searchParams;
  const saved = searchParams.saved === "1";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;

  const [settings, gateways] = await Promise.all([
    prisma.paymentGatewaySettings.findUnique({
      where: { id: "global" },
    }),
    listPaymentGatewayConfigs(),
  ]);

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <CreditCard className="mr-2 size-3.5" />
          Payment gateway
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Manager Payment Gateway
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Simpan credential gateway terenkripsi, pilih provider checkout aktif,
        </p>
        <div className="mt-4 rounded-[1.4rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Secret merchant disimpan di database dalam bentuk terenkripsi. Server
          tetap membutuhkan env <span className="font-semibold text-white">PAYMENT_CREDENTIALS_KEY</span> untuk enkripsi dan dekripsi credential.
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Gateway aktif"
            value={
              gateways.find((item) => item.provider === settings?.activeProvider)
                ?.displayName ?? "Belum dipilih"
            }
          />
          <StatCard
            label="Gateway enabled"
            value={String(gateways.filter((item) => item.isEnabled).length)}
          />
          <StatCard
            label="QR inline ready"
            value={String(
              gateways.filter((item) => item.capability.supportsInlineQr).length,
            )}
          />
        </div>
      </div>

      {saved ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Pengaturan payment gateway berhasil diperbarui.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6">
        {gateways.map((gateway) => {
          const isActive = settings?.activeProvider === gateway.provider;
          const enabledChannelCodes =
            gateway.provider === "paymenku"
              ? resolvePaymenkuEnabledChannelCodes(gateway.configJson)
              : gateway.provider === "duitku"
                ? resolveDuitkuEnabledChannelCodes(gateway.configJson)
              : [];
          const gatewayChannels =
            gateway.provider === "paymenku"
              ? PAYMENKU_PRIMARY_CHANNELS
              : gateway.provider === "duitku"
                ? DUITKU_PRIMARY_CHANNELS
                : [];

          return (
            <Card key={gateway.provider} className="glass-panel rounded-[2rem] border-white/10">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold text-white">
                        {gateway.displayName}
                      </h2>
                      {isActive ? (
                        <Badge className="border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                          Active checkout
                        </Badge>
                      ) : null}
                      {!gateway.capability.implemented ? (
                        <Badge variant="secondary">Configuration-ready</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      Provider: {gateway.provider}
                    </p>
                  </div>

                  <form action={setActivePaymentGatewayAction}>
                    <input type="hidden" name="provider" value={gateway.provider} />
                    <Button
                      type="submit"
                      variant={isActive ? "secondary" : "default"}
                      disabled={!gateway.capability.implemented}
                      className="w-full sm:w-auto"
                    >
                      {isActive ? "Sedang aktif" : "Jadikan checkout aktif"}
                    </Button>
                  </form>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <CapabilityItem
                    label="QRIS inline"
                    value={gateway.capability.supportsInlineQr ? "Ya" : "Tidak"}
                    icon={QrCode}
                  />
                  <CapabilityItem
                    label="Redirect checkout"
                    value={gateway.capability.supportsRedirectCheckout ? "Ya" : "Tidak"}
                    icon={CreditCard}
                  />
                  <CapabilityItem
                    label="Status polling"
                    value={gateway.capability.supportsStatusPolling ? "Ya" : "Tidak"}
                    icon={ShieldCheck}
                  />
                  <CapabilityItem
                    label="Credential"
                    value={gateway.hasSecret ? "Tersimpan" : "Belum ada"}
                    icon={ShieldCheck}
                  />
                </div>

                {gateway.lastError ? (
                  <div className="rounded-[1.4rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {gateway.lastError}
                  </div>
                ) : null}

                <form action={savePaymentGatewayConfigAction} className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <input type="hidden" name="provider" value={gateway.provider} />

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Display name"
                        name="displayName"
                        defaultValue={gateway.displayName}
                        placeholder="Nama gateway"
                      />
                      <Field
                        label="Default channel"
                        name="defaultChannelCode"
                        defaultValue={gateway.defaultChannelCode}
                        placeholder={gateway.provider === "duitku" ? "NQ" : "qris"}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Merchant ID"
                        name="merchantId"
                        defaultValue={gateway.merchantId}
                        placeholder={
                          gateway.provider === "duitku"
                            ? "Merchant Code Duitku"
                            : "Opsional"
                        }
                      />
                      <Field
                        label="Client/Public key"
                        name="clientKey"
                        defaultValue={gateway.clientKey}
                        placeholder="Opsional"
                      />
                    </div>

                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-white">
                        Secret / API key
                      </span>
                      <input
                        name="secret"
                        type="password"
                        placeholder={gateway.hasSecret ? "Biarkan kosong untuk mempertahankan secret" : "Masukkan secret"}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-white">
                        Config JSON
                      </span>
                      <textarea
                        name="configJson"
                        rows={4}
                        defaultValue={gateway.configJson ? JSON.stringify(gateway.configJson, null, 2) : ""}
                        placeholder='{"mode":"sandbox"}'
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                      />
                    </label>

                    {gatewayChannels.length > 0 ? (
                      <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                        <div>
                          <p className="text-sm font-medium text-white">
                            Channel checkout aktif
                          </p>
                          <p className="mt-1 text-xs leading-6 text-[var(--muted-foreground)]">
                            Admin bisa menyalakan atau mematikan QRIS dan virtual account yang ingin ditampilkan di halaman VIP.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {gatewayChannels.map((channel) => (
                            <label
                              key={channel.code}
                              className="flex items-start gap-3 rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-3"
                            >
                              <input
                                name="enabledChannels"
                                type="checkbox"
                                value={channel.code}
                                defaultChecked={enabledChannelCodes.includes(channel.code)}
                                className="mt-0.5 size-4 accent-[var(--accent)]"
                              />
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {channel.name}
                                </p>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  Code: {channel.code}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
                    <label className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4">
                      <input
                        name="isEnabled"
                        type="checkbox"
                        defaultChecked={gateway.isEnabled}
                        className="size-4 accent-[var(--accent)]"
                      />
                      <div>
                        <p className="font-medium text-white">Aktifkan gateway ini</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Gateway nonaktif tidak akan dipakai untuk checkout.
                        </p>
                      </div>
                    </label>

                    <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-[var(--muted)]">
                      {gateway.provider === "paymenku"
                        ? "Mode Paymenku mengikuti API key yang dipakai: sk_test untuk simulator dan sk_live untuk production. Config JSON mode tidak dipakai oleh adapter Paymenku."
                        : gateway.provider === "duitku"
                          ? 'Duitku memakai Merchant ID sebagai merchantCode, Secret sebagai API key, dan Config JSON mode "sandbox" atau "production". Callback URL: /api/payment/duitku/callback.'
                        : gateway.capability.implemented
                          ? "Gateway ini sudah siap dipakai checkout VIP setelah credential valid disimpan."
                          : "Gateway ini baru disiapkan untuk konfigurasi awal. Adapter API akan ditambahkan di fase berikutnya."}
                    </div>

                    <Button type="submit" className="w-full">
                      Simpan konfigurasi gateway
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{label}</span>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
      />
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function CapabilityItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof CreditCard;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
        <Icon className="size-4" />
        <span className="text-xs uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
