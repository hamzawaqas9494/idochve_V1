component {

    public struct function status() {
        var path = resolveBinary();
        return {
            "engine": "tesseract",
            "available": len(path) && fileExists(path),
            "binary": path
        };
    }

    public boolean function available() {
        return status().available;
    }

    public struct function recognize(required string imagePath, required string languageCode) {
        var bin = resolveBinary();
        if (!len(bin) || !fileExists(bin)) {
            return {
                ok: false,
                text: "",
                meanConfidence: 0,
                error: "Tesseract is not installed. Set IDOCHIVE_TESSERACT or install to C:\Program Files\Tesseract-OCR\tesseract.exe."
            };
        }
        if (!fileExists(arguments.imagePath)) {
            return { ok: false, text: "", meanConfidence: 0, error: "Temporary source file is missing." };
        }

        var lang = tessLanguage(arguments.languageCode);
        var outBase = getTempDirectory() & "idochive-ocr-" & createUUID();
        var tsvPath = outBase & ".tsv";
        var args = '"' & arguments.imagePath & '" "' & outBase & '" -l ' & lang;
        var dataDir = resolveTessdata();
        if (len(dataDir)) {
            args &= ' --tessdata-dir "' & dataDir & '"';
        }
        args &= " tsv";
        var stdout = "";
        var stderr = "";
        try {
            cfexecute(
                name=bin,
                arguments=args,
                variable="stdout",
                errorVariable="stderr",
                timeout=120
            );
        } catch (any err) {
            return {
                ok: false,
                text: "",
                meanConfidence: 0,
                error: "Tesseract failed to start: " & err.message
            };
        }

        if (!fileExists(tsvPath)) {
            var hint = len(trim(stderr)) ? trim(stderr) : trim(stdout);
            if (!len(hint)) {
                hint = "Tesseract produced no TSV. PDFs may need image conversion; try PNG or JPEG.";
            }
            return { ok: false, text: "", meanConfidence: 0, error: hint };
        }

        var parsed = parseTsv(fileRead(tsvPath));
        try {
            fileDelete(tsvPath);
        } catch (any ignore) {
        }
        return {
            ok: true,
            text: parsed.text,
            meanConfidence: parsed.meanConfidence,
            error: ""
        };
    }

    private string function resolveBinary() {
        var fromEnv = envValue("IDOCHIVE_TESSERACT");
        if (len(fromEnv) && fileExists(fromEnv)) {
            return fromEnv;
        }
        var windowsDefault = "C:\Program Files\Tesseract-OCR\tesseract.exe";
        if (fileExists(windowsDefault)) {
            return windowsDefault;
        }
        return fromEnv;
    }

    private string function tessLanguage(required string languageCode) {
        switch (lCase(arguments.languageCode)) {
            case "ar":
            case "ara":
                return "ara";
            case "en":
            case "eng":
                return "eng";
            default:
                return "eng+ara";
        }
    }

    private struct function parseTsv(required string tsv) {
        var words = [];
        var confidences = [];
        var lines = listToArray(arguments.tsv, chr(10), true);
        var first = true;
        for (var line in lines) {
            line = trim(replace(line, chr(13), "", "all"));
            if (!len(line)) {
                continue;
            }
            if (first) {
                first = false;
                if (left(lCase(line), 5) == "level") {
                    continue;
                }
            }
            var cols = listToArray(line, chr(9), true);
            if (arrayLen(cols) < 12) {
                continue;
            }
            var level = val(cols[1]);
            var conf = val(cols[11]);
            var word = trim(cols[12]);
            if (level != 5 || !len(word) || conf < 0) {
                continue;
            }
            arrayAppend(words, word);
            arrayAppend(confidences, conf);
        }
        var mean = 0;
        if (arrayLen(confidences)) {
            var sum = 0;
            for (var c in confidences) {
                sum += c;
            }
            mean = sum / arrayLen(confidences);
        }
        return {
            text: arrayToList(words, " "),
            meanConfidence: mean
        };
    }

    private string function resolveTessdata() {
        var fromEnv = envValue("IDOCHIVE_TESSDATA");
        if (len(fromEnv) && directoryExists(fromEnv)) {
            return fromEnv;
        }
        var localData = getDirectoryFromPath(expandPath("/Application.cfc")) & "..\tools\tesseract\tessdata";
        if (directoryExists(localData) && fileExists(localData & "\eng.traineddata")) {
            return localData;
        }
        var nextToBin = getDirectoryFromPath(resolveBinary()) & "tessdata";
        if (directoryExists(nextToBin)) {
            return nextToBin;
        }
        return "";
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
