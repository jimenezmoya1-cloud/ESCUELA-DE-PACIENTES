import { describe, it, expect } from "vitest"
import {
  generateSlotsForDay,
  filterByBlocks,
  filterByAppointments,
  filterByMinNotice,
} from "../slots"

describe("generateSlotsForDay", () => {
  it("returns 6 slots for a single 4h schedule (8:00-12:00 Bogota = 13:00-17:00 UTC)", () => {
    // 8:00-12:00 Bogota, slots de 30 min con buffer 10 min → cada 40 min
    // 8:00, 8:40, 9:20, 10:00, 10:40, 11:20 → 6 slots (último = 11:20-11:50, dentro del horario)
    const slots = generateSlotsForDay("2026-05-11", [
      { start_time: "08:00", end_time: "12:00" },
    ])
    expect(slots).toHaveLength(6)
    expect(slots[0]).toBe("2026-05-11T13:00:00.000Z")           // 8:00 Bogota
    expect(slots[5]).toBe("2026-05-11T16:20:00.000Z")           // 11:20 Bogota
  })

  it("supports split schedule (morning + afternoon)", () => {
    const slots = generateSlotsForDay("2026-05-11", [
      { start_time: "08:00", end_time: "10:00" },     // 8:00, 8:40, 9:20 → 3 (último 9:20-9:50)
      { start_time: "14:00", end_time: "16:00" },     // 14:00, 14:40, 15:20 → 3
    ])
    expect(slots).toHaveLength(6)
  })

  it("returns 0 slots for empty schedule list", () => {
    expect(generateSlotsForDay("2026-05-11", [])).toEqual([])
  })

  it("respects buffer — 8:00-9:00 only fits 1 slot", () => {
    // 8:00-9:00 = 60 min. Slot=30 + buffer=10. 8:00-8:30 cabe. 8:40 no cabe (8:40+30=9:10 > 9:00)
    const slots = generateSlotsForDay("2026-05-11", [
      { start_time: "08:00", end_time: "09:00" },
    ])
    expect(slots).toHaveLength(1)
    expect(slots[0]).toBe("2026-05-11T13:00:00.000Z")
  })
})

describe("filterByBlocks", () => {
  it("removes slots that overlap with a block", () => {
    const slots = [
      "2026-05-11T13:00:00.000Z",
      "2026-05-11T13:40:00.000Z",
      "2026-05-11T14:20:00.000Z",
    ]
    // Block from 13:30 to 14:00 UTC overlaps with the second slot (13:40-14:10)
    const blocks = [
      { start_at: "2026-05-11T13:30:00.000Z", end_at: "2026-05-11T14:00:00.000Z" },
    ]
    const result = filterByBlocks(slots, blocks)
    expect(result).toEqual([
      "2026-05-11T13:00:00.000Z",
      "2026-05-11T14:20:00.000Z",
    ])
  })

  it("does NOT remove slot whose end exactly equals block start (touching but not overlapping)", () => {
    const slots = ["2026-05-11T13:00:00.000Z"] // 13:00-13:30
    const blocks = [{ start_at: "2026-05-11T13:30:00.000Z", end_at: "2026-05-11T14:00:00.000Z" }]
    expect(filterByBlocks(slots, blocks)).toEqual(["2026-05-11T13:00:00.000Z"])
  })

  it("removes slot when block fully contains it", () => {
    const slots = ["2026-05-11T13:00:00.000Z"]
    const blocks = [{ start_at: "2026-05-11T12:00:00.000Z", end_at: "2026-05-11T15:00:00.000Z" }]
    expect(filterByBlocks(slots, blocks)).toEqual([])
  })
})

describe("filterByAppointments", () => {
  it("removes slot already taken by a scheduled appointment", () => {
    const slots = ["2026-05-11T13:00:00.000Z", "2026-05-11T13:40:00.000Z"]
    const apts = [{ starts_at: "2026-05-11T13:00:00.000Z", status: "scheduled" as const }]
    expect(filterByAppointments(slots, apts)).toEqual(["2026-05-11T13:40:00.000Z"])
  })

  it("ignores cancelled appointments", () => {
    const slots = ["2026-05-11T13:00:00.000Z"]
    const apts = [{ starts_at: "2026-05-11T13:00:00.000Z", status: "cancelled" as const }]
    expect(filterByAppointments(slots, apts)).toEqual(["2026-05-11T13:00:00.000Z"])
  })
})

describe("filterByMinNotice", () => {
  it("removes slots that are within MIN_NOTICE_HOURS", () => {
    const now = new Date("2026-05-10T12:00:00.000Z")
    const slots = [
      "2026-05-10T20:00:00.000Z",          // 8h ahead — too soon
      "2026-05-11T11:00:00.000Z",          // 23h ahead — too soon
      "2026-05-11T12:00:00.000Z",          // exactly 24h — borderline (>= passes)
      "2026-05-11T13:00:00.000Z",          // 25h ahead — ok
    ]
    expect(filterByMinNotice(slots, now)).toEqual([
      "2026-05-11T12:00:00.000Z",
      "2026-05-11T13:00:00.000Z",
    ])
  })
})
