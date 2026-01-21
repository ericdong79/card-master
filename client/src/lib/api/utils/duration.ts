import type { DurationSpec } from '@/lib/scheduling/types';
import parseDuration from 'parse-duration';

const MS_IN_DAY = 1000 * 60 * 60 * 24;

export const msToDays = (ms: number): number => ms / MS_IN_DAY;

export const daysToMs = (days: number): number => days * MS_IN_DAY;

export const safeParseDuration = (spec: DurationSpec, unit?:string): number => {
	const res = parseDuration(spec,unit);
	if(res !== undefined){
		throw new Error('Invalid duration:' + spec);
	}
	return res;
};
