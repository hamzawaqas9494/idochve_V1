component {

    public struct function status() {
        var path = resolveBinary();
        return {
            "engine": "pdftoppm",
            "available": len(path) && fileExists(path)
        };
    }

    public boolean function available() {
        return status().available;
    }

    public struct function rasterize(required string pdfPath) {
        var bin = resolveBinary();
        if (!len(bin) || !fileExists(bin)) {
            return {
                ok: false,
                files: [],
                dir: "",
                error: "Install Poppler or set IDOCHIVE_PDFTOPPM so iDocHive can convert PDF pages before OCR."
            };
        }
        if (!fileExists(arguments.pdfPath)) {
            return { ok: false, files: [], dir: "", error: "Temporary PDF is missing." };
        }

        var outDir = getTempDirectory() & "idochive-pdf-" & createUUID();
        directoryCreate(outDir);
        var prefix = outDir & "/page";
        var args = '-png -r 300 "' & arguments.pdfPath & '" "' & prefix & '"';
        var stdout = "";
        var stderr = "";
        try {
            cfexecute(
                name=bin,
                arguments=args,
                variable="stdout",
                errorVariable="stderr",
                timeout=180
            );
        } catch (any err) {
            deleteDir(outDir);
            return {
                ok: false,
                files: [],
                dir: "",
                error: "pdftoppm failed to start: " & err.message
            };
        }

        var files = listPngs(outDir);
        if (!arrayLen(files)) {
            var hint = len(trim(stderr)) ? trim(stderr) : trim(stdout);
            if (!len(hint)) {
                hint = "pdftoppm produced no page images. The PDF may be empty or damaged.";
            }
            deleteDir(outDir);
            return { ok: false, files: [], dir: "", error: hint };
        }
        return { ok: true, files: files, dir: outDir, error: "" };
    }

    public struct function rasterizePage(required string pdfPath, required numeric page) {
        var bin = resolveBinary();
        if (!len(bin) || !fileExists(bin)) {
            return {
                ok: false,
                path: "",
                dir: "",
                error: "Install Poppler or set IDOCHIVE_PDFTOPPM so iDocHive can render PDF pages."
            };
        }
        if (!fileExists(arguments.pdfPath)) {
            return { ok: false, path: "", dir: "", error: "Temporary PDF is missing." };
        }
        var pageNum = max(1, int(arguments.page));
        var outDir = getTempDirectory() & "idochive-preview-" & createUUID();
        directoryCreate(outDir);
        var prefix = outDir & "/preview";
        var args = "-f " & pageNum & " -l " & pageNum & " -singlefile -png -r 150 """ & arguments.pdfPath & """ """ & prefix & """";
        var stdout = "";
        var stderr = "";
        try {
            cfexecute(
                name=bin,
                arguments=args,
                variable="stdout",
                errorVariable="stderr",
                timeout=60
            );
        } catch (any err) {
            deleteDir(outDir);
            return { ok: false, path: "", dir: "", error: "pdftoppm failed to start: " & err.message };
        }
        var png = outDir & "/preview.png";
        if (!fileExists(png)) {
            var listed = listPngs(outDir);
            if (arrayLen(listed)) {
                png = listed[1];
            }
        }
        if (!fileExists(png)) {
            var hint = len(trim(stderr)) ? trim(stderr) : trim(stdout);
            if (!len(hint)) {
                hint = "pdftoppm did not render that page.";
            }
            deleteDir(outDir);
            return { ok: false, path: "", dir: "", error: hint };
        }
        return { ok: true, path: png, dir: outDir, error: "" };
    }

    public numeric function pageCount(required string pdfPath) {
        var bin = resolveInfoBinary();
        if (!len(bin) || !fileExists(bin) || !fileExists(arguments.pdfPath)) {
            return 0;
        }
        var stdout = "";
        var stderr = "";
        try {
            cfexecute(
                name=bin,
                arguments="""" & arguments.pdfPath & """",
                variable="stdout",
                errorVariable="stderr",
                timeout=30
            );
        } catch (any err) {
            return 0;
        }
        var match = reFindNoCase("Pages:\s*([0-9]+)", stdout & " " & stderr, 1, true);
        if (!arrayLen(match.pos) || arrayLen(match.pos) LT 2 || match.pos[2] LTE 0) {
            return 0;
        }
        return val(mid(stdout & " " & stderr, match.pos[2], match.len[2]));
    }

    public void function deleteDir(required string dir) {
        if (!len(arguments.dir) || !directoryExists(arguments.dir)) {
            return;
        }
        try {
            directoryDelete(arguments.dir, true);
        } catch (any ignore) {
            return;
        }
    }

    private array function listPngs(required string dir) {
        var names = directoryList(arguments.dir, false, "name", "*.png");
        arraySort(names, function(required string first, required string second) {
            return pageNumber(arguments.first) - pageNumber(arguments.second);
        });
        var files = [];
        for (var name in names) {
            arrayAppend(files, arguments.dir & "/" & name);
        }
        return files;
    }

    private numeric function pageNumber(required string name) {
        var match = reFindNoCase("([0-9]+)\.png$", arguments.name, 1, true);
        if (!arrayLen(match.pos) || arrayLen(match.pos) LT 2 || match.pos[2] LTE 0) {
            return 0;
        }
        return val(mid(arguments.name, match.pos[2], match.len[2]));
    }

    private string function resolveBinary() {
        var fromEnv = envValue("IDOCHIVE_PDFTOPPM");
        if (len(fromEnv) && fileExists(fromEnv)) {
            return fromEnv;
        }
        var localRoot = getDirectoryFromPath(expandPath("/Application.cfc")) & "..\tools\poppler-windows";
        if (directoryExists(localRoot)) {
            var localMatches = directoryList(localRoot, true, "path", "pdftoppm.exe");
            if (arrayLen(localMatches)) {
                return localMatches[1];
            }
        }
        var candidates = [
            "C:\Program Files\poppler\Library\bin\pdftoppm.exe",
            "C:\Program Files\poppler\bin\pdftoppm.exe",
            "C:\poppler\Library\bin\pdftoppm.exe",
            "C:\poppler\bin\pdftoppm.exe"
        ];
        for (var candidate in candidates) {
            if (fileExists(candidate)) {
                return candidate;
            }
        }
        return fromEnv;
    }

    private string function resolveInfoBinary() {
        var ppm = resolveBinary();
        if (!len(ppm) || !fileExists(ppm)) {
            return "";
        }
        var dir = getDirectoryFromPath(ppm);
        var windows = dir & "pdfinfo.exe";
        if (fileExists(windows)) {
            return windows;
        }
        var unix = dir & "pdfinfo";
        if (fileExists(unix)) {
            return unix;
        }
        return "";
    }

    private string function envValue(required string key) {
        var path = getDirectoryFromPath(expandPath("/Application.cfc")) & ".env";
        if (fileExists(path)) {
            var lines = listToArray(fileRead(path), chr(10));
            for (var rawLine in lines) {
                var line = trim(replace(rawLine, chr(13), "", "all"));
                if (!len(line) || left(line, 1) == "##") {
                    continue;
                }
                local.eq = find("=", line);
                if (local.eq GT 1 && trim(left(line, local.eq - 1)) == arguments.key) {
                    return trim(mid(line, local.eq + 1, len(line)));
                }
            }
        }
        if (structKeyExists(server.system.environment, arguments.key)) {
            return toString(server.system.environment[arguments.key]);
        }
        return "";
    }
}
