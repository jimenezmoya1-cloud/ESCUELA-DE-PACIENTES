import { describe, it, expect } from "vitest"
import {
  utcIsoToBogotaDateKey,
  bogotaToUtcIso,
  formatTimeBogota,
  slotEndIso,
  startOfDayBogotaIso,
  endOfDayBogotaIso,
} from "../format"

describe("Bogota TZ format helpers", () => {
  it("converts UTC midnight to Bogota previous day 19:00 (UTC-5)", () => {
    // 2026-05-10 00:00 UTC = 2026-05-09 19:00 Bogota
    expect(utcIsoToBogotaDateKey("2026-05-10T00:00:00.000Z")).toBe("2026-05-09")
  })

  it("converts UTC 04:00 to Bogota 23:00 prev day", () => {
    expect(utcIsoToBogotaDateKey("2026-05-10T04:00:00.000Z")).toBe("2026-05-09")
  })

  it("UTC 05:00 is Bogota midnight = same day", () => {
    expect(utcIsoToBogotaDateKey("2026-05-10T05:00:00.000Z")).toBe("2026-05-10")
  })

  it("converts Bogota local to UTC ISO", () => {
    // 2026-05-10 10:00 Bogota = 15:00 UTC
    expect(bogotaToUtcIso("2026-05-10", "10:00")).toBe("2026-05-10T15:00:00.000Z")
  })

  it("formatTimeBogota renders 10:30 AM for UTC 15:30", () => {
    expect(formatTimeBogota("2026-05-10T15:30:00.000Z")).toMatch(/10:30\s?AM/i)
  })

  it("slotEndIso adds 30 min", () => {
    expect(slotEndIso("2026-05-10T15:00:00.000Z")).toBe("2026-05-10T15:30:00.000Z")
  })

  it("startOfDayBogotaIso returns 00:00 Bogota = 05:00 UTC", () => {
    expect(startOfDayBogotaIso("2026-05-10T15:00:00.000Z")).toBe("2026-05-10T05:00:00.000Z")
  })

  it("endOfDayBogotaIso returns 23:59:59.999 Bogota = 04:59:59.999 UTC next day", () => {
    expect(endOfDayBogotaIso("2026-05-10T15:00:00.000Z")).toBe("2026-05-11T04:59:59.999Z")
  })
})
