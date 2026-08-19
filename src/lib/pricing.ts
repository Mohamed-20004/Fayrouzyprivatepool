import { chaletConfig, SlotType } from "@/config/chalet.config";
import { addDays, isWeekend } from "@/lib/dates";

/**
 * A slot's price: weekday vs weekend rate chosen by the slot's start date
 * (or end date, per the `priceBasis` config flag), weekend = Friday/Saturday.
 */
export function priceFor(dateStr: string, slot: SlotType): number {
  const basisDate =
    chaletConfig.priceBasis === "endDate" && chaletConfig.slots[slot].endsNextDay
      ? addDays(dateStr, 1)
      : dateStr;
  const weekend = isWeekend(basisDate);
  const p = chaletConfig.prices;
  if (slot === "day") return weekend ? p.dayWeekend : p.dayWeekday;
  return weekend ? p.nightWeekend : p.nightWeekday;
}

export function formatAmount(amount: number): string {
  return `${amount} ${chaletConfig.currency}`;
}
