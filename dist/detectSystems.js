import { systems } from "./systemsMap.js";

function normalise(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

const idMap = new Map();
const folderLookup = new Map();

for (const system of systems) {
    idMap.set(system.id, system);

    for (const name of system.names) {
        folderLookup.set(normalise(name), system.id);
    }
}

function detectSystemFromFolder(folderName) {
    const normalisedFolder = normalise(folderName);

    // MATCH EXATO
    // "PS2"       -> PS2
    // "ps2"       -> PS2
    // "PS2 ISOs"  -> NÃO
    // "PS22"      -> NÃO
    // "MyPS2"     -> NÃO
    return folderLookup.get(normalisedFolder) ?? null;
}

export function detectConsole(fullPath) {
    // Aceita caminhos Windows (\) e Linux (/)
    const parts = fullPath.split(/[\\/]+/);

    // Remove o nome do arquivo
    parts.pop();

    // Procura da pasta mais próxima do arquivo para trás
    for (let i = parts.length - 1; i >= 0; i--) {
        const systemId = detectSystemFromFolder(parts[i]);

        if (systemId !== null) {
            return {
                consoleId: systemId,
                folderName: parts[i]
            };
        }
    }

    // Nenhuma pasta de console encontrada
    return null;
}

export function getSystem(id) {
    return idMap.get(id) ?? null;
}