component {
    this.name = "iDocHive";
    this.sessionManagement = true;
    this.sessionTimeout = createTimeSpan(0, 8, 0, 0);
    this.applicationTimeout = createTimeSpan(1, 0, 0, 0);
    this.setClientCookies = true;
    this.datasource = "idochive";
    this.serialization.preserveCaseForStructKey = true;

    variables.localEnv = loadLocalEnv();

    this.datasources["idochive"] = {
        class: "org.postgresql.Driver",
        connectionString: "jdbc:postgresql://"
            & env("IDOCHIVE_DB_HOST", "127.0.0.1")
            & ":"
            & env("IDOCHIVE_DB_PORT", "5432")
            & "/"
            & env("IDOCHIVE_DB_NAME", "idochive"),
        username: env("IDOCHIVE_DB_USER", "idochive"),
        password: env("IDOCHIVE_DB_PASSWORD", "idochive_dev_only")
    };

    public void function onApplicationStart() {
        startBackgroundWorker();
    }

    public boolean function onRequestStart(required string targetPage) {
        applyCors();

        if (cgi.request_method == "OPTIONS") {
            cfcontent(type="application/json", reset=true);
            abort;
        }

        if (!structKeyExists(application, "workerRunning") || !application.workerRunning) {
            startBackgroundWorker();
        }
        return true;
    }

    private void function startBackgroundWorker() {
        if (structKeyExists(application, "workerRunning") && application.workerRunning) {
            return;
        }
        application.workerRunning = true;
        cfthread(name="idochive-job-worker", action="run") {
            while (true) {
                try {
                    new idochive.JobWorker().processAvailable();
                } catch (any err) {
                    // Keep the loop alive if a single job fails.
                }
                var waited = 0;
                while (waited < 3000) {
                    if (structKeyExists(application, "tickRequested") && application.tickRequested) {
                        application.tickRequested = false;
                        break;
                    }
                    sleep(100);
                    waited += 100;
                }
            }
        };
    }

    public boolean function onMissingTemplate(required string targetPage) {
        if (left(arguments.targetPage, 5) == "/api/") {
            return false;
        }
        var uiIndex = expandPath("./www/index.html");
        if (fileExists(uiIndex)) {
            cfheader(name="Content-Type", value="text/html; charset=utf-8");
            writeOutput(fileRead(uiIndex));
            return true;
        }
        return false;
    }

    private void function applyCors() {
        var headers = getHttpRequestData().headers;
        var origin = "";
        if (structKeyExists(headers, "Origin")) {
            origin = trim(toString(headers.Origin));
        } else if (structKeyExists(headers, "origin")) {
            origin = trim(toString(headers.origin));
        }
        cfheader(name="Vary", value="Origin");
        if (!len(origin) || !isAllowedOrigin(origin)) {
            return;
        }
        cfheader(name="Access-Control-Allow-Origin", value=origin);
        cfheader(name="Access-Control-Allow-Credentials", value="true");
        cfheader(name="Access-Control-Allow-Headers", value="Content-Type, Authorization, X-Requested-With");
        cfheader(name="Access-Control-Allow-Methods", value="GET, POST, PATCH, PUT, DELETE, OPTIONS");
    }

    private boolean function isAllowedOrigin(required string origin) {
        var raw = env(
            "IDOCHIVE_CORS_ORIGINS",
            "http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:5173,http://localhost:5173"
        );
        var allowed = listToArray(raw, ",");
        for (var item in allowed) {
            if (trim(item) == arguments.origin) {
                return true;
            }
        }
        return false;
    }

    private struct function loadLocalEnv() {
        var values = {};
        var path = expandPath("./.env");
        if (!fileExists(path)) {
            return values;
        }
        var lines = listToArray(fileRead(path), chr(10));
        for (var line in lines) {
            line = trim(replace(line, chr(13), "", "all"));
            if (!len(line) || left(line, 1) == "##") {
                continue;
            }
            var eq = find("=", line);
            if (eq GT 1) {
                values[trim(left(line, eq - 1))] = trim(mid(line, eq + 1, len(line)));
            }
        }
        return values;
    }

    private string function env(required string key, required string fallback) {
        if (structKeyExists(variables.localEnv, arguments.key) && len(variables.localEnv[arguments.key])) {
            return variables.localEnv[arguments.key];
        }
        if (structKeyExists(server.system.environment, arguments.key) && len(server.system.environment[arguments.key])) {
            return server.system.environment[arguments.key];
        }
        return arguments.fallback;
    }
}
