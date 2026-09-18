<cfsetting showdebugoutput="false" requesttimeout="45">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfif cgi.request_method NEQ "GET">
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
<cfscript>
    jobs = new idochive.JobService();
    access = jobs.callerAccess();
    filter = url.filter ?: "all";
    try {
        sessionCommit();
    } catch (any ignore) {
    }
    cfheader(name="Cache-Control", value="no-cache, no-store");
    cfheader(name="X-Accel-Buffering", value="no");
    cfheader(name="Connection", value="keep-alive");
    cfcontent(type="text/event-stream; charset=utf-8", reset=true);
    lastHash = "";
    deadline = getTickCount() + 30000;
    while (getTickCount() < deadline) {
        payload = jobs.listForUser(filter, access);
        fingerprint = jobs.progressFingerprint(payload);
        if (fingerprint != lastHash) {
            writeOutput("event: jobs" & chr(10) & "data: " & serializeJSON(payload) & chr(10) & chr(10));
            lastHash = fingerprint;
        } else {
            writeOutput(": keepalive" & chr(10) & chr(10));
        }
        cfflush();
        sleep(400);
    }
</cfscript>
