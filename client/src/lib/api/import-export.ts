import type { ApiClient } from "./client";
import {
	createImportExportRepository,
	downloadCardMasterExport,
	parseCardMasterExport,
	type BuildExportPayloadOptions,
	type CardMasterExportPayload,
	type ImportDataOptions,
	type ImportDataSummary,
} from "@/lib/data/repositories/import-export-repository";

export {
	downloadCardMasterExport,
	parseCardMasterExport,
	type BuildExportPayloadOptions,
	type CardMasterExportPayload,
	type ImportDataOptions,
	type ImportDataSummary,
};

export function buildCardMasterExport(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	options: BuildExportPayloadOptions,
): Promise<CardMasterExportPayload> {
	return createImportExportRepository({ client }).buildCardMasterExport({
		accountUserId,
		profileId,
		...options,
	});
}

export function importCardMasterData(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	payload: CardMasterExportPayload,
	options: ImportDataOptions,
): Promise<ImportDataSummary> {
	return createImportExportRepository({ client }).importCardMasterData({
		accountUserId,
		profileId,
		payload,
		...options,
	});
}
