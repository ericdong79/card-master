import type { MasteryPresentationPlugin } from "../types";
import { defaultAcademicMasteryPlugin } from "./plugins/default-academic";
import { plantGrowthMasteryPlugin } from "./plugins/plant-growth";
import { storybookImageMasteryPlugin } from "./plugins/storybook-image";

const pluginMap = new Map<string, MasteryPresentationPlugin>([
	[defaultAcademicMasteryPlugin.id, defaultAcademicMasteryPlugin],
	[plantGrowthMasteryPlugin.id, plantGrowthMasteryPlugin],
	[storybookImageMasteryPlugin.id, storybookImageMasteryPlugin],
]);

export function registerMasteryPresentationPlugin(plugin: MasteryPresentationPlugin): void {
	pluginMap.set(plugin.id, plugin);
}

export function listMasteryPresentationPlugins(): MasteryPresentationPlugin[] {
	return [...pluginMap.values()];
}

export function getMasteryPresentationPlugin(pluginId?: string | null): MasteryPresentationPlugin {
	if (pluginId && pluginMap.has(pluginId)) {
		return pluginMap.get(pluginId) as MasteryPresentationPlugin;
	}
	return defaultAcademicMasteryPlugin;
}
