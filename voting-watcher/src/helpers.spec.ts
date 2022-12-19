import { secondsToDaysAndHours, abbreviateNumber } from "./helpers";

describe("helpers", () => {
  describe("secondsToDaysAndHours", () => {
    it("should handle days and hours", () => {
      const seconds = 2849281; // 32 Days 23 Hours 28 Minutes 1 Second
      const expected = "32 days 23 hours";
      const result = secondsToDaysAndHours(seconds);
      expect(result).toBe(expected);
    });
    it("should handle hours and minutes", () => {
      const seconds = 8763; // 2 Hours 26 Minutes 3 Seconds
      const expected = "2 hours 26 mins";
      const result = secondsToDaysAndHours(seconds);
      expect(result).toBe(expected);
    });
    it("should handle only days", () => {
      const seconds = 432000; // 5 Days
      const expected = "5 days";
      const result = secondsToDaysAndHours(seconds);
      expect(result).toBe(expected);
    });
    it("should handle only hours", () => {
      const seconds = 3600; // 1 Hour
      const expected = "1 hour";
      const result = secondsToDaysAndHours(seconds);
      expect(result).toBe(expected);
    });
    it("should handle only mins", () => {
      const seconds = 600; // 10 Minutes
      const expected = "10 mins";
      const result = secondsToDaysAndHours(seconds);
      expect(result).toBe(expected);
    });
    it("should handle less than a minute", () => {
      const seconds = 50; // 50 Sec
      const expected = "less than a minute";
      const result = secondsToDaysAndHours(seconds);
      expect(result).toBe(expected);
    });
  });
  describe("abbreviateNumber", () => {
    it("should handle ordinary", () => {
      const number = 154;
      const expected = "154";
      const result = abbreviateNumber(number);
      expect(result).toBe(expected);
    });
    it("should handle float", () => {
      const number = 154.12;
      const expected = "154";
      const result = abbreviateNumber(number);
      expect(result).toBe(expected);
    });
    it("should handle 1_000s", () => {
      const number = 1154;
      const expected = "1.2k";
      const result = abbreviateNumber(number);
      expect(result).toBe(expected);
    });
    it("should handle 1_000_000s", () => {
      const number = 1_400_154;
      const expected = "1.4M";
      const result = abbreviateNumber(number);
      expect(result).toBe(expected);
    });
    it("should handle 1_000_000_000s", () => {
      const number = 3_500_400_154;
      const expected = "3.5G";
      const result = abbreviateNumber(number);
      expect(result).toBe(expected);
    });
  });
});
