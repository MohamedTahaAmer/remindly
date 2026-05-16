import type { ReviewRating } from "#/db/schema"

const DAY_MS = 24 * 60 * 60 * 1000

// Fixed interval ladder, in days.
export const INTERVALS_DAYS = [1, 3, 7, 14, 30, 90, 180, 365] as const

export const MAX_INTERVAL_INDEX = INTERVALS_DAYS.length - 1

export function intervalDaysFor(index: number): number {
	const clamped = Math.max(0, Math.min(index, MAX_INTERVAL_INDEX))
	return INTERVALS_DAYS[clamped]!
}

// SM-2-style adjustment on top of the fixed ladder.
//   again → reset to 0
//   hard  → stay on the same step
//   good  → advance one step
//   easy  → advance two steps
export function nextIntervalIndex(current: number, rating: ReviewRating): number {
	switch (rating) {
		case "again":
			return 0
		case "hard":
			return Math.min(current, MAX_INTERVAL_INDEX)
		case "good":
			return Math.min(current + 1, MAX_INTERVAL_INDEX)
		case "easy":
			return Math.min(current + 2, MAX_INTERVAL_INDEX)
	}
}

export function nextScheduledFor(rating: ReviewRating, currentIndex: number, from: Date = new Date()): {
	intervalIndex: number
	scheduledFor: Date
} {
	const intervalIndex = nextIntervalIndex(currentIndex, rating)
	const days = intervalDaysFor(intervalIndex)
	return { intervalIndex, scheduledFor: new Date(from.getTime() + days * DAY_MS) }
}
