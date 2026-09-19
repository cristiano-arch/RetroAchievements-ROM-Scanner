import fs from "fs";
import path from "path";
import { hashHistoryPath, hashIndexPath, supportedPath, unsupportedPath } from "./paths.js";
export function buildCache() {
    let supportedGames = new Map();
    let unsupportedGames = new Map();
    let hashIndex = new Map();
    let hashHistory = new Map();
    if (fs.existsSync(supportedPath))
        supportedGames = new Map(Object.entries(JSON.parse(fs.readFileSync(supportedPath, "utf8"))));
    if (fs.existsSync(unsupportedPath))
        unsupportedGames = new Map(Object.entries(JSON.parse(fs.readFileSync(unsupportedPath, "utf8"))));
    if (fs.existsSync(hashIndexPath))
        hashIndex = new Map(Object.entries(JSON.parse(fs.readFileSync(hashIndexPath, "utf8"))));
    if (fs.existsSync(hashHistoryPath))
        hashHistory = new Map(Object.entries(JSON.parse(fs.readFileSync(hashHistoryPath, "utf8"))));
    return {
        supportedGames,
        unsupportedGames,
        hashIndex,
        hashHistory,
    };
}
export function cleanCache(cache, romFolder) {
    for (const [relative] of cache) {
        const fullPath = path.join(romFolder, relative);
        if (!fs.existsSync(fullPath))
            cache.delete(relative);
    }
}
export function cleanHashIndex(index, romFolder) {
    for (const [hash, paths] of index) {
        const valid = paths.filter((p) => fs.existsSync(path.join(romFolder, p)));
        if (valid.length === 0) {
            index.delete(hash);
        }
        else {
            index.set(hash, valid);
        }
    }
}
