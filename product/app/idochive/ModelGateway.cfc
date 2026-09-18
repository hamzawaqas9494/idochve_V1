component {

    public struct function status() {
        var base = baseUrl();
        var reachable = false;
        var modelPresent = false;
        var generatePresent = false;
        try {
            cfhttp(method="GET", url=base & "/api/tags", timeout=5, throwonerror=false, result="tagsRes");
            if (val(tagsRes.statuscode) == 200) {
                reachable = true;
                var body = deserializeJSON(toString(tagsRes.filecontent));
                if (structKeyExists(body, "models") && isArray(body.models)) {
                    for (var row in body.models) {
                        var name = structKeyExists(row, "name") ? toString(row.name) : "";
                        if (findNoCase(embedModel(), name) == 1 || name == embedModel()) {
                            modelPresent = true;
                        }
                        if (findNoCase(generateModel(), name) == 1 || name == generateModel()) {
                            generatePresent = true;
                        }
                    }
                }
            }
        } catch (any ignore) {
            reachable = false;
        }
        return {
            "engine": "ollama",
            "model": embedModel(),
            "dimension": 768,
            "available": reachable && modelPresent,
            "generateModel": generateModel(),
            "generateAvailable": reachable && generatePresent,
            "baseUrl": base
        };
    }

    public boolean function available() {
        return status().available;
    }

    public struct function embed(required string text, numeric timeoutSeconds = 120) {
        var trimmed = left(trim(arguments.text), 8000);
        if (!len(trimmed)) {
            return { ok: false, vector: [], error: "Chunk text is empty. Embedding skipped." };
        }
        var health = status();
        if (!health.available) {
            return {
                ok: false,
                vector: [],
                error: "Ollama nomic-embed-text is not available at " & health.baseUrl & ". Install Ollama locally and pull nomic-embed-text. No public AI API is used."
            };
        }
        var payload = serializeJSON({
            "model": embedModel(),
            "input": trimmed
        });
        try {
            cfhttp(method="POST", url=health.baseUrl & "/api/embed", timeout=max(5, val(arguments.timeoutSeconds)), throwonerror=false, result="httpRes") {
                cfhttpparam(type="header", name="Content-Type", value="application/json");
                cfhttpparam(type="body", value=payload);
            }
        } catch (any err) {
            return { ok: false, vector: [], error: "Local embedding request failed to start." };
        }
        if (val(httpRes.statuscode) != 200) {
            return { ok: false, vector: [], error: "Local embedding endpoint returned " & val(httpRes.statuscode) & "." };
        }
        var parsed = parseEmbedBody(toString(httpRes.filecontent));
        if (!parsed.ok) {
            return parsed;
        }
        if (arrayLen(parsed.vector) != 768) {
            return { ok: false, vector: [], error: "Embedding dimension was " & arrayLen(parsed.vector) & ", expected 768." };
        }
        return { ok: true, vector: parsed.vector, error: "" };
    }

    public struct function generate(required string prompt, numeric timeoutSeconds = 60) {
        var health = status();
        if (!health.generateAvailable) {
            return {
                ok: false,
                text: "",
                error: "Local generate model is not available. Extractive citations will be used. No public AI API is used."
            };
        }
        var payload = serializeJSON({
            "model": generateModel(),
            "prompt": left(arguments.prompt, 12000),
            "stream": false
        });
        try {
            cfhttp(method="POST", url=health.baseUrl & "/api/generate", timeout=max(10, val(arguments.timeoutSeconds)), throwonerror=false, result="httpRes") {
                cfhttpparam(type="header", name="Content-Type", value="application/json");
                cfhttpparam(type="body", value=payload);
            }
        } catch (any err) {
            return { ok: false, text: "", error: "Local generate request failed to start." };
        }
        if (val(httpRes.statuscode) != 200) {
            return { ok: false, text: "", error: "Local generate endpoint returned " & val(httpRes.statuscode) & "." };
        }
        try {
            var body = deserializeJSON(toString(httpRes.filecontent));
        } catch (any err) {
            return { ok: false, text: "", error: "Local generate response was not JSON." };
        }
        var text = structKeyExists(body, "response") ? trim(toString(body.response)) : "";
        if (!len(text)) {
            return { ok: false, text: "", error: "Local generate response was empty." };
        }
        return { ok: true, text: text, error: "" };
    }

    public string function vectorLiteral(required array vector) {
        var parts = [];
        for (var n in arguments.vector) {
            arrayAppend(parts, toString(n));
        }
        return "[" & arrayToList(parts, ",") & "]";
    }

    private struct function parseEmbedBody(required string raw) {
        try {
            var body = deserializeJSON(arguments.raw);
        } catch (any err) {
            return { ok: false, vector: [], error: "Local embedding response was not JSON." };
        }
        if (structKeyExists(body, "embeddings") && isArray(body.embeddings) && arrayLen(body.embeddings)) {
            if (isArray(body.embeddings[1])) {
                return { ok: true, vector: body.embeddings[1], error: "" };
            }
            return { ok: true, vector: body.embeddings, error: "" };
        }
        if (structKeyExists(body, "embedding") && isArray(body.embedding)) {
            return { ok: true, vector: body.embedding, error: "" };
        }
        return { ok: false, vector: [], error: "Local embedding response had no vector." };
    }

    private string function embedModel() {
        var fromEnv = envValue("IDOCHIVE_EMBED_MODEL");
        return len(fromEnv) ? fromEnv : "nomic-embed-text";
    }

    private string function generateModel() {
        var fromEnv = envValue("IDOCHIVE_GENERATE_MODEL");
        return len(fromEnv) ? fromEnv : "qwen2.5:3b";
    }

    private string function baseUrl() {
        var fromEnv = envValue("IDOCHIVE_OLLAMA");
        if (len(fromEnv)) {
            return rereplace(fromEnv, "/$", "");
        }
        return "http://127.0.0.1:11434";
    }

    private string function envValue(required string key) {
        var path = getDirectoryFromPath(expandPath("/Application.cfc")) & ".env";
        if (fileExists(path)) {
            var lines = listToArray(fileRead(path), chr(10));
            for (var line in lines) {
                line = trim(replace(line, chr(13), "", "all"));
                if (!len(line) || left(line, 1) == "##") {
                    continue;
                }
                var eq = find("=", line);
                if (eq GT 1 && trim(left(line, eq - 1)) == arguments.key) {
                    return trim(mid(line, eq + 1, len(line)));
                }
            }
        }
        if (structKeyExists(server.system.environment, arguments.key)) {
            return toString(server.system.environment[arguments.key]);
        }
        return "";
    }
}
