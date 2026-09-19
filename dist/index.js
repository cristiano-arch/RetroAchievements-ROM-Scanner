import fs from "fs";
import path from "path";

import {
    hashHistoryPath,
    hashIndexPath,
    supportedPath,
    unsupportedPath
} from "./paths.js";

import {
    buildCache,
    cleanCache,
    cleanHashIndex
} from "./cache.js";

import {
    buildAllHashDatabases,
    globalHashMap
} from "./api.js";

import {
    detectConsole,
    getSystem
} from "./detectSystems.js";

import { handleDuplicates } from "./handleDuplicates.js";
import { scanSource } from "./scanSource.js";
import { isRomFile } from "./filterRoms.js";
import { raHashInput } from "./hasher.js";
import { systems } from "./systemsMap.js";


export async function runScanner(romFolder, apiKey) {

    // =========================================================
    // BUILD DATABASE
    // =========================================================

    if (apiKey)
        await buildAllHashDatabases(apiKey);


    // =========================================================
    // CACHE
    // =========================================================

    const {
        supportedGames,
        unsupportedGames,
        hashIndex,
        hashHistory
    } = buildCache();

    cleanCache(
        supportedGames,
        romFolder
    );

    cleanCache(
        unsupportedGames,
        romFolder
    );

    cleanHashIndex(
        hashIndex,
        romFolder
    );


    // =========================================================
    // SCAN FILES
    // =========================================================

    const files = [];

    for await (const file of scanSource(romFolder)) {

        if (isRomFile(file.path))
            files.push(file);
    }


    // =========================================================
    // COUNTERS
    // =========================================================

    let i = 0;
    let errors = 0;
    const invalidExtensionFiles = [];

    const total = files.length;


    // =========================================================
    // PROCESS FILES
    // =========================================================

    for await (const file of files) {

        if (!isRomFile(file.path))
            continue;


        i++;

        const progress = `[${i}/${total}]`;


        // =====================================================
        // FILE NAME
        // =====================================================

        const name = path.basename(
            file.internalPath ??
            file.realPath ??
            file.path
        );


        const size = file.size ?? 0;


        // =====================================================
        // 1. DETECT VALID CONSOLE FIRST
        // =====================================================
        //
        // IMPORTANT:
        //
        // Nothing else is processed until a valid console
        // folder is found.
        //
        // detectConsole() returns:
        //
        // {
        //     consoleId: ...,
        //     folderName: ...
        // }
        //
        // =====================================================

        const consolePath = file.realPath
            ? file.realPath
            : path.join(
                path.dirname(file.source),
                file.internalPath
            );


        const detection =
            detectConsole(consolePath);


        // =====================================================
        // NO VALID CONSOLE
        // =====================================================

        if (!detection) {

            errors++;

            console.log(
                `❌ Unknown console:\n` +
                ` The console name was not found in any part of the directory which the file belongs.\n` +
                ` At least one folder in the specified directory must contain one of the following console names` +
                ` (CASE IS IGNORED):\n` +
                ` CONSOLE_SHORT_NAME: "possible_name_1", "possible_name_2", "possible_name_3";\n` +
                ` NES: "nes", "famicom", "nintendo entertainment system";\n` +
                ` FDS: "fds", "famicom disk system";\n` +
                ` SNES: "snes", "super nintendo", "super famicom", "super nintendo entertainment system";\n` +
                ` N64: "n64", "nintendo 64";\n` +
                ` GB: "gb", "gameboy", "game boy";\n` +
                ` GBC: "gbc", "gameboy color", "game boy color";\n` +
                ` GBA: "gba", "gameboy advance", "game boy advance";\n` +
                ` DS: "ds", "nds", "nintendo ds";\n` +
                ` DSI: "dsi";\n` +
                ` 3DS: "3ds";\n` +
                ` GC: "gamecube", "gc";\n` +
                ` WII: "wii";\n` +
                ` WII U: "wiiu", "wii u";\n` +
                ` VIRTUAL BOY: "virtual boy";\n` +
                ` GENESIS: "genesis", "mega drive", "megadrive", "md";\n` +
                ` MASTER SYSTEM: "master system", "sms";\n` +
                ` GAME GEAR: "game gear", "gg";\n` +
                ` SEGA CD: "sega cd";\n` +
                ` 3DX: "32x";\n` +
                ` SATURN: "saturn";\n` +
                ` DREAMCAST: "dreamcast";\n` +
                ` PS1: "psx", "ps1", "playstation";\n` +
                ` PS2: "ps2", "playstation2", "playstation 2";\n` +
                ` PSP: "psp";\n` +
                ` PC ENGINE: "pc engine", "turbografx", "tg16";\n` +
                ` PC ENGINE CD: "pc engine cd", "turbografx cd";\n` +
                ` NEO GEO CD: "neo geo cd";\n` +
                ` ATARI 2600: "atari 2600";\n` +
                ` ATARI 7800: "atari 7800";\n` +
                ` LYNX: "lynx";\n` +
                ` JAGUAR: "jaguar";\n` +
                ` ARCADE: "arcade", "mame";`
            );

            break;
        }


        // =====================================================
        // GET CONSOLE ID
        // =====================================================

        const consoleId =
            detection.consoleId;


        // =====================================================
        // GET SYSTEM
        // =====================================================

        const system =
            getSystem(consoleId);


        if (!system) {

            errors++;

            console.log(
                `${progress} ❌ Unknown system ID: ${consoleId}`
            );

            continue;
        }


        const consoleName =
            system.shortName;


        // =====================================================
        // 2. CHECK VALID ROM EXTENSION
        // =====================================================
        //
        // This happens ONLY after a valid console was found.
        //
        // For archive files, internalPath is used so that
        // .7z/.zip/.rar is NOT treated as the ROM extension.
        //
        // =====================================================

        const extensionPath =
            file.internalPath ??
            file.realPath ??
            file.path;


        const extension =
            path.extname(extensionPath)
                .toLowerCase();


         if (!system.extensions.includes(extension)) {

            invalidExtensionFiles.push({
                path: file.path,
                console: consoleName,
                extension
            });

            //  ["psx", "ps1", "playstation"]
            if (consoleName !== 'PS1' || extension !== '.bin') {
                console.log(
                    `${progress} ⚠️ ${consoleName.padEnd(8)} ${name} -> Invalid extension ${extension}`
                );
            }

            continue;
        }


        // =====================================================
        // 3. CACHE
        // =====================================================

        const historyKey =
            `${name}:${size}:${file.source}`;


        const cached =
            hashHistory.get(historyKey);


        let hash =
            supportedGames.get(file.path) ??
            unsupportedGames.get(file.path) ??
            null;


        if (
            !hash &&
            cached &&
            cached.size === size
        ) {

            hash = cached.hash;
        }


        // =====================================================
        // VERIFY CACHED HASH
        // =====================================================

        if (
            hash &&
            !globalHashMap.has(hash)
        ) {

            hash = null;
        }


        // =====================================================
        // 4. HASH
        // =====================================================

        if (!hash) {

            try {

                process.stdout.write(
                    `${progress} 🔄 ${consoleName.padEnd(8)} ${name} -> Hashing...`
                );


                const input =
                    file.realPath ??
                    file.getStream?.();


                if (!input) {

                    throw new Error(
                        "No input source available"
                    );
                }


                hash =
                    await raHashInput(
                        consoleId,
                        input,
                        name
                    );

            }
            catch (err) {

                if (err instanceof Error) {

                    errors++;

                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);

                    console.log(
                        `${progress} ❌ ${consoleName.padEnd(8)} ${name} -> ${err.message}`
                    );
                }
            }
        }


        // =====================================================
        // HASH FAILED
        // =====================================================

        if (!hash)
            continue;


        // =====================================================
        // 5. FIND GAME
        // =====================================================

        const game =
            globalHashMap.get(hash);


        // =====================================================
        // HASH INDEX
        // =====================================================

        if (!hashIndex.has(hash))
            hashIndex.set(hash, []);


        const list =
            hashIndex.get(hash);


        const set =
            new Set(list);


        set.add(file.path);


        hashIndex.set(
            hash,
            [...set]
        );


        // =====================================================
        // SUPPORTED / UNSUPPORTED
        // =====================================================

        if (game) {

            supportedGames.set(
                file.path,
                hash
            );

        }
        else {

            unsupportedGames.set(
                file.path,
                hash
            );
        }


        // =====================================================
        // HASH HISTORY
        // =====================================================

        hashHistory.set(
            historyKey,
            {
                hash,
                size
            }
        );


        // =====================================================
        // RESULT
        // =====================================================

        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);

        console.log(
            `${progress} ${game ? "✅" : "❌"} ${consoleName.padEnd(8)} ${name} -> ${game?.Title ?? "Not supported"} ${game ? `[${game.NumAchievements} Achievements]` : ""}`
        );
    }


    // =========================================================
    // SCAN COMPLETE
    // =========================================================

    console.log(
        "\nScan complete"
    );


    console.log(
        `\nSupported games: ${supportedGames.size}`
    );


    console.log(
        `Unsupported games: ${unsupportedGames.size}`
    );

    console.log(
    `Invalid extension: ${invalidExtensionFiles.length}`
    );

    if (errors > 0) {

        console.log(
            `Errors: ${errors}`
        );
    }


    // =========================================================
    // DUPLICATES
    // =========================================================

    handleDuplicates(
        hashIndex,
        supportedGames,
        unsupportedGames,
        globalHashMap
    );


    // =========================================================
    // SAVE FILES
    // =========================================================

    fs.writeFileSync(
        supportedPath,
        JSON.stringify(
            Object.fromEntries(
                supportedGames
            ),
            null,
            2
        )
    );


    fs.writeFileSync(
        unsupportedPath,
        JSON.stringify(
            Object.fromEntries(
                unsupportedGames
            ),
            null,
            2
        )
    );


    fs.writeFileSync(
        hashIndexPath,
        JSON.stringify(
            Object.fromEntries(
                hashIndex
            ),
            null,
            2
        )
    );


    fs.writeFileSync(
        hashHistoryPath,
        JSON.stringify(
            Object.fromEntries(
                hashHistory
            ),
            null,
            2
        )
    );


    fs.writeFileSync(
        "supported_games.txt",
        Array.from(
            supportedGames.keys()
        ).join("\n")
    );


    fs.writeFileSync(
        "unsupported_games.txt",
        Array.from(
            unsupportedGames.keys()
        ).join("\n")
    );
}
