import fs from "fs";
import { duplicatesPath } from "./paths.js";
export function handleDuplicates(hashIndex, supportedGames, unsupportedGames, globalHashMap) {
    const duplicateGames = new Map();
    let duplicateGroups = 0;
    for (const [hash, files] of hashIndex) {
        if (files.length <= 1)
            continue;
        const [original, ...dupes] = files;
        duplicateGroups++;
        console.log(`Duplicate games: ${duplicateGroups}`);
        const game = globalHashMap.get(hash);
        console.log(`\n${game?.Title ?? "Unknown Game"}`);
        if (!original)
            continue;
        console.log(`+ Original: ${original}`);
        duplicateGames.set(original, hash);
        for (const p of dupes) {
            console.log(`  - ${p}`);
            duplicateGames.set(p, hash);
            supportedGames.delete(p);
            unsupportedGames.delete(p);
        }
        hashIndex.set(hash, [original]);
    }
    if (duplicateGames.size > 0) {
        fs.writeFileSync(duplicatesPath, JSON.stringify(Object.fromEntries(duplicateGames), null, 2));
        fs.writeFileSync("duplicate_games.txt", Array.from(duplicateGames.keys()).join("\n"));
    }
    else {
        if (fs.existsSync(duplicatesPath))
            fs.unlinkSync(duplicatesPath);
        if (fs.existsSync("duplicate_games.txt"))
            fs.unlinkSync("duplicate_games.txt");
    }
    return duplicateGames;
}
