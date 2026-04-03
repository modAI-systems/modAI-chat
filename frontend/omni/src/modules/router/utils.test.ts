import type { Routes } from "sv-router";
import type { Component } from "svelte";
import { describe, expect, it } from "vitest";
import { mergeRouteMaps } from "./utils.ts";

describe("mergeRouteMaps", () => {
    it("deep-merges nested route branches from multiple maps", () => {
        const about = {} as Component;
        const bar = {} as Component;
        const yolo = {} as Component;

        const routesA: Routes = {
            "/about": about,
            "/next": {
                "/bar": bar,
            },
        };

        const routesB: Routes = {
            "/next": {
                "/yolo": yolo,
            },
        };

        expect(mergeRouteMaps([routesA, routesB])).toEqual({
            "/about": about,
            "/next": {
                "/bar": bar,
                "/yolo": yolo,
            },
        });
    });

    it("overwrites non-branch keys while keeping branch deep-merge behavior", () => {
        const oldLeaf = {} as Component;
        const newLeaf = {} as Component;
        const oldLayout = {} as Component;
        const newLayout = {} as Component;

        const routesA: Routes = {
            "/next": {
                "/leaf": oldLeaf,
                layout: oldLayout,
            },
        };

        const routesB: Routes = {
            "/next": {
                "/leaf": newLeaf,
                layout: newLayout,
            },
        };

        expect(mergeRouteMaps([routesA, routesB])).toEqual({
            "/next": {
                "/leaf": newLeaf,
                layout: newLayout,
            },
        });
    });
});
