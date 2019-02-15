import { EntityArray } from ".";

export interface ODataFunctions {
    concat<T extends string | EntityArray<any>>(left: T, right: T): T;
    contains(left: string, right: string): boolean;
    endswith(text: string, search: string): boolean;
    indexof(text: string, search: string): number;
    length(text: string): number;
    startswith(text: string, search: string): boolean;
    substring(text: string, start: number, length?: number): string;

    //String functions
    tolower(text: string): string;
    toupper(text: string): string;
    trim(text: string): string;

    //Date functions
    date(datetime: Date): Date;
    day(date: Date): number;
    fractionalseconds(date: Date): number;
    hour(date: Date): number;
    maxdatetime(): Date;
    mindatetime(): Date;
    minute(date: Date): number;
    month(date: Date): number;
    now(): Date;
    second(date: Date): number;
    time(date: Date): Date;
    totaloffsetminutes(date: Date): number;
    year(date: Date): number;

    //Arithmetic Functions
    celling(value: number): number;
    floor(value: number): number;
    round(value: number): number;
}