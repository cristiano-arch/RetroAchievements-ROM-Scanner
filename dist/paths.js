import envPaths from "env-paths";
import path from "path";
import { fileURLToPath } from "url";

const paths = envPaths("ra-scan");

export const APP_DIR = getAppDir();
export const CACHE_DIR = paths.cache;
export const API_DIR = path.join(CACHE_DIR, "api");
export const SCAN_DIR = path.join(CACHE_DIR, "scan");
export const HISTORY_DIR = path.join(CACHE_DIR, "history");
export const consolesPath = path.join(API_DIR, "consoles.json");
export const supportedPath = path.join(SCAN_DIR, "supported_games.json");
export const unsupportedPath = path.join(SCAN_DIR, "unsupported_games.json");
export const duplicatesPath = path.join(SCAN_DIR, "duplicate_games.json");
export const hashIndexPath = path.join(SCAN_DIR, "hash_index.json");
export const hashHistoryPath = path.join(HISTORY_DIR, "hash_history.json");

function getAppDir() {
    if (process.execPath.endsWith("ra-scan") ||
        process.execPath.endsWith("ra-scan.exe")) {
        return path.dirname(process.execPath);
    }

    return path.dirname(fileURLToPath(import.meta.url)).replace(/\\dist$/, "");
}

export function getRelative(romFolder, file) {
    return path.relative(romFolder, file).replace(/\\/g, "/");
}